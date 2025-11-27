import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Plus, Send, Save, X, Download, Loader } from 'lucide-react';

export default function InvoiceForm({ setView }) {
  const { clients, addInvoice, emailTemplate, googleScriptUrl } = useApp();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    paymentTerms: 14,
    includeGst: false,
    lineItems: [{ category: 'Web Design', description: '', quantity: 1, unitPrice: 0 }]
  });

  const getDueDate = (date, terms) => {
    const result = new Date(date);
    result.setDate(result.getDate() + parseInt(terms));
    return result.toISOString().split('T')[0];
  };

  const calculateSubtotal = () => formData.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const calculateTax = () => formData.includeGst ? calculateSubtotal() * 0.1 : 0;
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const generateInvoiceNumber = () => {
    // Generate invoice number based on current date: INV-YYYYMMDD-XXXX
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
  };

  const handleSave = async (status) => {
    if (!formData.clientId) {
      setErrorMessage('Please select a client');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const total = calculateTotal();
      const invoiceNumber = generateInvoiceNumber();
      
      // Don't include id - let Supabase generate UUID
      const newInvoice = {
        clientId: formData.clientId,
        invoiceNumber: invoiceNumber,
        issueDate: formData.issueDate,
        dueDate: getDueDate(formData.issueDate, formData.paymentTerms),
        status: status,
        total: total,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        includeGst: formData.includeGst,
        lineItems: formData.lineItems
      };

      // Save invoice first to get the database ID
      const result = await addInvoice(newInvoice);
      
      if (!result || !result.data) {
        throw new Error('Failed to save invoice');
      }

      const savedInvoice = result.data;

      // If status is 'Sent', handle email/PDF
      if (status === 'Sent' && googleScriptUrl) {
        setIsSending(true);
        const client = clients.find(c => c.id === formData.clientId);
        
        try {
          // Dynamically import PDF generator
          const { generateInvoicePDF } = await import('../utils/pdfGenerator');
          // Generate PDF Blob using saved invoice data (await the async function)
          const doc = await generateInvoicePDF(savedInvoice, client);
          const pdfBase64 = doc.output('datauristring').split(',')[1]; // Remove "data:application/pdf;base64,"

          // Send to Google Apps Script
          console.log('Sending to Google Script:', googleScriptUrl);
          console.log('Invoice data:', { invoiceNumber: savedInvoice.invoiceNumber, client: client.name });
          
          const response = await fetch(googleScriptUrl, {
              method: 'POST',
              mode: 'no-cors', // Google Scripts CORS fix - prevents reading response
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  invoice: savedInvoice,
                  client: client,
                  pdfBase64: pdfBase64,
                  emailBody: getPreviewEmail()
              })
          });
          
          // Note: with no-cors we can't check response.ok, assume success if no network error
          // Check Google Apps Script execution logs to verify it actually ran
          console.log('Request sent (check Google Script execution logs to verify)');
          alert('Invoice sent to automation queue! (Email + Drive + Sheet)\n\n⚠️ Check your Google Apps Script execution logs to verify it processed successfully.');
        } catch (e) {
          alert('Invoice saved but error triggering automation: ' + e.message);
          console.error(e);
        } finally {
          setIsSending(false);
        }
      } else if (status === 'Sent') {
        // Fallback: Download PDF locally if no script URL
        try {
          const client = clients.find(c => c.id === formData.clientId);
          const { generateInvoicePDF } = await import('../utils/pdfGenerator');
          const doc = await generateInvoicePDF(savedInvoice, client);
          doc.save(`${savedInvoice.invoiceNumber}.pdf`);
          alert('PDF downloaded. Configure Google Script in Settings to enable auto-emailing.');
        } catch (e) {
          alert('Error generating PDF: ' + e.message);
          console.error(e);
        }
      }

      setView('invoices');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to save invoice. Please try again.');
      console.error('Error saving invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewEmail = () => {
    const client = clients.find(c => c.id === formData.clientId);
    if (!client) return "Please select a client first.";
    
    // Generate preview invoice number for display
    const previewInvoiceNumber = generateInvoiceNumber();
    
    let body = emailTemplate || '';
    body = body.replace(/\[Contact Name\]/g, client.contactName || client.name);
    body = body.replace(/\[Invoice Number\]/g, previewInvoiceNumber);
    body = body.replace(/\[Total\]/g, `$${calculateTotal().toFixed(2)}`);
    return body;
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto relative">
      <h2 className="text-2xl font-bold mb-6">New Invoice</h2>
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMessage}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select 
            className="w-full p-2 border rounded-md"
            value={formData.clientId}
            onChange={e => setFormData({...formData, clientId: e.target.value})}
          >
            <option value="">Select Client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
          <select 
            className="w-full p-2 border rounded-md"
            value={formData.paymentTerms}
            onChange={e => setFormData({...formData, paymentTerms: e.target.value})}
          >
            <option value={7}>Net 7</option>
            <option value={14}>Net 15</option>
            <option value={30}>Net 30</option>
          </select>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-2">Line Items</h3>
        <div className="flex gap-2 mb-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="w-1/4">Category</div>
          <div className="flex-1">Description</div>
          <div className="w-20">Quantity</div>
          <div className="w-24">Price</div>
        </div>
        <div className="space-y-3">
          {formData.lineItems.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
               <div className="w-1/4">
                  <select 
                    className="w-full p-2 text-sm border rounded"
                    value={item.category}
                    onChange={e => {
                        const newItems = [...formData.lineItems];
                        newItems[idx].category = e.target.value;
                        setFormData({...formData, lineItems: newItems});
                    }}
                  >
                    <option>Web Design</option>
                    <option>SEO</option>
                    <option>Development</option>
                    <option>PPC</option>
                  </select>
               </div>
               <div className="flex-1">
                  <input 
                    type="text" 
                    className="w-full p-2 text-sm border rounded"
                    placeholder="Description"
                    value={item.description}
                    onChange={e => {
                        const newItems = [...formData.lineItems];
                        newItems[idx].description = e.target.value;
                        setFormData({...formData, lineItems: newItems});
                    }}
                  />
               </div>
               <div className="w-20">
                  <input type="number" className="w-full p-2 text-sm border rounded" placeholder="Qty" value={item.quantity} 
                    onChange={e => {
                        const newItems = [...formData.lineItems];
                        newItems[idx].quantity = parseFloat(e.target.value);
                        setFormData({...formData, lineItems: newItems});
                    }}
                  />
               </div>
               <div className="w-24">
                  <input type="number" className="w-full p-2 text-sm border rounded" placeholder="Price" value={item.unitPrice}
                    onChange={e => {
                        const newItems = [...formData.lineItems];
                        newItems[idx].unitPrice = parseFloat(e.target.value);
                        setFormData({...formData, lineItems: newItems});
                    }}
                   />
               </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-3">
          <button 
              onClick={() => setFormData({...formData, lineItems: [...formData.lineItems, { category: 'Web Design', description: '', quantity: 1, unitPrice: 0 }]})}
              className="text-sm text-blue-600 flex items-center font-medium hover:underline"
          >
              <Plus size={14} className="mr-1"/> Add Line Item
          </button>
          <div className="flex items-center">
             <input 
                type="checkbox" 
                id="includeGst" 
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={formData.includeGst}
                onChange={e => setFormData({...formData, includeGst: e.target.checked})}
             />
             <label htmlFor="includeGst" className="ml-2 text-sm font-medium text-gray-700">Include GST (10%)</label>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <button 
          onClick={() => setView('invoices')} 
          disabled={isSaving || isSending}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          Cancel
        </button>
        <div className="flex gap-3">
            <button 
              onClick={() => handleSave('Draft')} 
              disabled={isSaving || isSending}
              className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Save size={18} className="mr-2"/> {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button 
                onClick={() => {
                    if(!formData.clientId) {
                      setErrorMessage('Please select a client');
                      return;
                    }
                    setShowEmailModal(true);
                }} 
                disabled={isSaving || isSending}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send size={18} className="mr-2"/> Send Invoice
            </button>
        </div>
      </div>

      {showEmailModal && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-20 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Email Preview</h3>
                    <button onClick={() => setShowEmailModal(false)}><X size={20}/></button>
                </div>
                <div className="bg-gray-100 p-4 rounded text-sm font-mono mb-4 whitespace-pre-wrap border border-gray-200">
                    {getPreviewEmail()}
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-sm text-gray-600" disabled={isSending}>Back</button>
                    <button 
                        onClick={() => handleSave('Sent')} 
                        disabled={isSending}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                    >
                        {isSending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                        {isSending ? 'Sending...' : 'Confirm & Send'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
