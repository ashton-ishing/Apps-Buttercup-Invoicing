import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';
import { createClerkSupabaseClient, supabase as publicSupabase } from './supabaseClient';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { session } = useSession();
  const [supabase, setSupabase] = useState(publicSupabase);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [recurringInvoices, setRecurringInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [googleScriptUrl, setGoogleScriptUrl] = useState('https://script.google.com/a/macros/buttercup.digital/s/AKfycbwIfiDx1xcbDUSMSp-rgh4ycoedoF19kiwIozFfs3IfMAY58XSPS45Axf5jwLhrxPUuKA/exec');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    const setupClient = async () => {
      if (session) {
        try {
          const client = await createClerkSupabaseClient(session);
          setSupabase(client);
          console.log('Supabase client authenticated with Clerk session');
        } catch (error) {
          console.error('Failed to setup authenticated Supabase client:', error);
          setSupabase(publicSupabase);
        }
      } else {
        console.log('No Clerk session, using public Supabase client');
        setSupabase(publicSupabase);
      }
    };
    setupClient();
  }, [session]);

  // Fetch Initial Data
  useEffect(() => {
    if (!session) return; // Wait for session

    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch all data in parallel
        const [clientsRes, invoicesRes, recurringRes, expensesRes, transactionsRes] = await Promise.all([
          supabase.from('clients').select('*'),
          supabase.from('invoices').select('*'),
          supabase.from('recurring_invoices').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('transactions').select('*')
        ]);

        if (clientsRes.data) setClients(clientsRes.data);
        if (invoicesRes.data) setInvoices(invoicesRes.data);
        if (recurringRes.data) setRecurringInvoices(recurringRes.data);
        if (expensesRes.data) setExpenses(expensesRes.data);
        if (transactionsRes.data) setTransactions(transactionsRes.data);
        
        // Load settings (handle case where no settings exist)
        const settingsRes = await supabase.from('user_settings').select('*').limit(1).maybeSingle();
        if (settingsRes.data) {
          setEmailTemplate(settingsRes.data.email_template || '');
          setGoogleScriptUrl(settingsRes.data.google_script_url || '');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, session]);

  const addInvoice = async (invoice) => {
    try {
      // Remove id if provided - let Supabase generate UUID
      const { id, ...invoiceData } = invoice;
      const { data, error } = await supabase.from('invoices').insert([invoiceData]).select().single();
      
      if (error) {
        console.error('Error adding invoice:', error);
        throw new Error(error.message || 'Failed to add invoice');
      }
      
      if (data) {
        setInvoices([...invoices, data]);
        return { success: true, data };
      }
    } catch (error) {
      console.error('Error adding invoice:', error);
      throw error;
    }
  };

  const addRecurringInvoice = async (invoice) => {
    try {
      // Remove id if provided - let Supabase generate UUID
      const { id, ...invoiceData } = invoice;
      const { data, error } = await supabase.from('recurring_invoices').insert([invoiceData]).select().single();
      
      if (error) {
        console.error('Error adding recurring invoice:', error);
        throw new Error(error.message || 'Failed to add recurring invoice');
      }
      
      if (data) {
        setRecurringInvoices([...recurringInvoices, data]);
        return { success: true, data };
      }
    } catch (error) {
      console.error('Error adding recurring invoice:', error);
      throw error;
    }
  };
  
  const addClient = async (client) => {
    try {
      // Prepare client data - only include fields that exist in schema
      // Remove id if present, let Supabase generate UUID
      const { id, ...clientData } = client;
      
      // Ensure we only send valid fields
      // Convert empty strings to null for optional fields
      const insertData = {
        name: clientData.name?.trim() || '',
        contactName: clientData.contactName?.trim() || null,
        email: clientData.email?.trim() || null
      };
      
      // Validate required fields
      if (!insertData.name) {
        throw new Error('Company name is required');
      }
      
      console.log('Inserting client data:', insertData);
      
      const { data, error } = await supabase
        .from('clients')
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw new Error(error.message || error.details || 'Failed to add client');
      }
      
      if (data) {
        setClients([...clients, data]);
        return { success: true, data };
      }
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    }
  };

  const removeClient = async (clientId) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (!error) setClients(clients.filter(c => c.id !== clientId));
  };

  const reconcileTransaction = async (txId, matchId, matchType) => {
    // Optimistic update
    setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, reconciled: true } : tx));
    await supabase.from('transactions').update({ reconciled: true }).eq('id', txId);

    if (matchType === 'invoice') {
      setInvoices(prev => prev.map(inv => inv.id === matchId ? { ...inv, status: 'Paid' } : inv));
      await supabase.from('invoices').update({ status: 'Paid' }).eq('id', matchId);
    } else if (matchType === 'expense') {
      setExpenses(prev => prev.map(exp => exp.id === matchId ? { ...exp, isPaid: true } : exp));
      await supabase.from('expenses').update({ isPaid: true }).eq('id', matchId);
    }
  };

  const saveSettings = async (emailTemplate, googleScriptUrl) => {
    try {
      // Check if settings exist (use maybeSingle to handle no rows)
      const { data: existing } = await supabase.from('user_settings').select('id').limit(1).maybeSingle();
      
      const settingsData = {
        email_template: emailTemplate,
        google_script_url: googleScriptUrl,
        updated_at: new Date().toISOString()
      };

      let result;
      if (existing) {
        // Update existing
        result = await supabase.from('user_settings').update(settingsData).eq('id', existing.id).select().single();
      } else {
        // Insert new
        result = await supabase.from('user_settings').insert([settingsData]).select().single();
      }

      if (result.error) {
        throw new Error(result.error.message || 'Failed to save settings');
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      supabase, // Expose the authenticated client
      clients, setClients, addClient, removeClient,
      invoices, setInvoices, addInvoice,
      recurringInvoices, setRecurringInvoices, addRecurringInvoice,
      expenses, setExpenses,
      transactions, setTransactions, reconcileTransaction,
      emailTemplate, setEmailTemplate,
      googleScriptUrl, setGoogleScriptUrl,
      dateRange, setDateRange,
      loading,
      saveSettings
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
