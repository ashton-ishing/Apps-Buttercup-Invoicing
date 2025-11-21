import React, { createContext, useContext, useState } from 'react';
import { mockClients, mockInvoices, mockExpenses, mockTransactions } from './mockData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [clients, setClients] = useState(mockClients);
  const [invoices, setInvoices] = useState(mockInvoices);
  const [expenses, setExpenses] = useState(mockExpenses);
  const [transactions, setTransactions] = useState(mockTransactions);
  
  const [emailTemplate, setEmailTemplate] = useState(
    "Dear [Contact Name],\n\nPlease find attached invoice [Invoice Number] for [Total].\n\nWe appreciate your business.\n\nBest regards,\nButter Invoicing Team"
  );

  const [dateRange, setDateRange] = useState({ 
    label: 'Last 30 Days', 
    value: 30,
    startDate: null,
    endDate: null 
  });

  const addInvoice = (invoice) => setInvoices([...invoices, invoice]);
  
  const reconcileTransaction = (txId, matchId, matchType) => {
    setTransactions(prev => prev.map(tx => 
      tx.id === txId ? { ...tx, reconciled: true } : tx
    ));

    if (matchType === 'invoice') {
      setInvoices(prev => prev.map(inv => 
        inv.id === matchId ? { ...inv, status: 'Paid' } : inv
      ));
    } else if (matchType === 'expense') {
      setExpenses(prev => prev.map(exp => 
        exp.id === matchId ? { ...exp, isPaid: true } : exp
      ));
    }
  };

  return (
    <AppContext.Provider value={{
      clients, setClients,
      invoices, setInvoices, addInvoice,
      expenses, setExpenses,
      transactions, setTransactions, reconcileTransaction,
      emailTemplate, setEmailTemplate,
      dateRange, setDateRange
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
