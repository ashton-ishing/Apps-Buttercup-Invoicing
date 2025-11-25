import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { mockClients, mockInvoices, mockExpenses, mockTransactions } from './mockData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [recurringInvoices, setRecurringInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Fetch Initial Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Ideally these would be parallel, but sequential is fine for now
      const { data: cl } = await supabase.from('clients').select('*');
      if (cl && cl.length > 0) setClients(cl);
      else setClients(mockClients); // Fallback if empty

      const { data: inv } = await supabase.from('invoices').select('*');
      if (inv && inv.length > 0) setInvoices(inv);
      
      const { data: rec } = await supabase.from('recurring_invoices').select('*');
      if (rec) setRecurringInvoices(rec);

      const { data: exp } = await supabase.from('expenses').select('*');
      if (exp && exp.length > 0) setExpenses(exp);
      else setExpenses(mockExpenses);

      const { data: tx } = await supabase.from('transactions').select('*');
      if (tx && tx.length > 0) setTransactions(tx);
      else setTransactions(mockTransactions);

      setLoading(false);
    };

    fetchData();
  }, []);

  const addInvoice = async (invoice) => {
    const { error } = await supabase.from('invoices').insert([invoice]);
    if (!error) setInvoices([...invoices, invoice]);
    else console.error("Error adding invoice:", error);
  };

  const addRecurringInvoice = async (invoice) => {
    const { error } = await supabase.from('recurring_invoices').insert([invoice]);
    if (!error) setRecurringInvoices([...recurringInvoices, invoice]);
  };
  
  const addClient = async (client) => {
    const { error } = await supabase.from('clients').insert([client]);
    if (!error) setClients([...clients, client]);
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

  return (
    <AppContext.Provider value={{
      clients, setClients, addClient, removeClient,
      invoices, setInvoices, addInvoice,
      recurringInvoices, setRecurringInvoices, addRecurringInvoice,
      expenses, setExpenses,
      transactions, setTransactions, reconcileTransaction,
      emailTemplate, setEmailTemplate,
      googleScriptUrl, setGoogleScriptUrl,
      dateRange, setDateRange,
      loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
