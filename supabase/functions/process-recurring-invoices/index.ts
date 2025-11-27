import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client (using service role key for full access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseServiceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date (UTC)
    const today = new Date().toISOString().split('T')[0]
    
    // Find recurring invoices that are due today and are active
    const { data: recurringInvoices, error: fetchError } = await supabase
      .from('recurring_invoices')
      .select('*')
      .eq('status', 'Active')
      .lte('nextRunDate', today)

    if (fetchError) {
      throw new Error(`Failed to fetch recurring invoices: ${fetchError.message}`)
    }

    if (!recurringInvoices || recurringInvoices.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recurring invoices due today',
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get user settings for Google Script URL
    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_script_url, email_template')
      .limit(1)
      .maybeSingle()

    const googleScriptUrl = settings?.google_script_url || null
    const emailTemplate = settings?.email_template || ''

    const processedInvoices = []
    const errors = []

    // Process each recurring invoice
    for (const recurring of recurringInvoices) {
      try {
        // Get client information
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', recurring.clientId)
          .single()

        if (!client) {
          errors.push(`Client not found for recurring invoice ${recurring.id}`)
          continue
        }

        // Calculate due date based on payment terms
        const issueDate = new Date()
        const dueDate = new Date(issueDate)
        dueDate.setDate(dueDate.getDate() + (recurring.paymentTerms || 14))

        // Generate invoice number: INV-[FIRST4LETTERS]-[SEQUENTIAL]
        // Get first 4 letters of client name (uppercase, alphanumeric only)
        const clientCode = client.name
          .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
          .substring(0, 4)
          .toUpperCase()
          .padEnd(4, 'X') // Pad with X if less than 4 characters
        
        // Find the highest sequential number for this client
        const { data: clientInvoices } = await supabase
          .from('invoices')
          .select('invoiceNumber')
          .eq('clientId', recurring.clientId)
        
        let maxSeq = 0
        if (clientInvoices) {
          clientInvoices.forEach(inv => {
            // Parse existing invoice numbers in format INV-XXXX-####
            const match = inv.invoiceNumber?.match(/INV-[A-Z]{4}-(\d+)/)
            if (match) {
              const seq = parseInt(match[1], 10)
              if (seq > maxSeq) maxSeq = seq
            }
          })
        }
        
        // Increment for new invoice
        const nextSeq = maxSeq + 1
        const invoiceNumber = `INV-${clientCode}-${nextSeq.toString().padStart(4, '0')}`

        // Create the invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            clientId: recurring.clientId,
            invoiceNumber: invoiceNumber,
            issueDate: issueDate.toISOString().split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0],
            status: 'Sent', // Auto-send recurring invoices
            total: recurring.total,
            subtotal: recurring.subtotal,
            tax: recurring.tax,
            includeGst: recurring.includeGst,
            lineItems: recurring.lineItems
          }])
          .select()
          .single()

        if (invoiceError) {
          errors.push(`Failed to create invoice for recurring ${recurring.id}: ${invoiceError.message}`)
          continue
        }

        // Calculate next run date based on frequency
        const nextRunDate = new Date(recurring.nextRunDate || recurring.startDate)
        switch (recurring.frequency) {
          case 'Monthly':
            nextRunDate.setMonth(nextRunDate.getMonth() + 1)
            break
          case 'Quarterly':
            nextRunDate.setMonth(nextRunDate.getMonth() + 3)
            break
          case 'Yearly':
            nextRunDate.setFullYear(nextRunDate.getFullYear() + 1)
            break
          default:
            nextRunDate.setMonth(nextRunDate.getMonth() + 1) // Default to monthly
        }

        // Update recurring invoice with next run date
        const { error: updateError } = await supabase
          .from('recurring_invoices')
          .update({ nextRunDate: nextRunDate.toISOString().split('T')[0] })
          .eq('id', recurring.id)

        if (updateError) {
          errors.push(`Failed to update nextRunDate for recurring ${recurring.id}: ${updateError.message}`)
        }

        // Optionally send email via Google Script if configured
        if (googleScriptUrl && newInvoice) {
          try {
            // Generate email body with template
            let emailBody = emailTemplate
            emailBody = emailBody.replace(/\[Contact Name\]/g, client.contactName || client.name || '')
            emailBody = emailBody.replace(/\[Invoice Number\]/g, invoiceNumber)
            emailBody = emailBody.replace(/\[Total\]/g, `$${recurring.total?.toFixed(2) || '0.00'}`)

            // Note: PDF generation would need to be done here or in Google Script
            // For now, we'll send basic invoice data
            await fetch(googleScriptUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoice: newInvoice,
                client: client,
                emailBody: emailBody,
                isRecurring: true
              })
            })
          } catch (emailError) {
            // Don't fail the whole process if email fails
            console.error('Email sending failed:', emailError)
            errors.push(`Email failed for invoice ${invoiceNumber}`)
          }
        }

        processedInvoices.push({
          invoiceNumber: invoiceNumber,
          clientName: client.name,
          amount: recurring.total
        })

      } catch (error) {
        errors.push(`Error processing recurring invoice ${recurring.id}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedInvoices.length,
        invoices: processedInvoices,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

