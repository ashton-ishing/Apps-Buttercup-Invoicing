export const mockClients = [
  { id: 'c1', name: 'Acme Corp', contactName: 'John Doe', email: 'john@acme.com' },
  { id: 'c2', name: 'Stark Ind', contactName: 'Tony Stark', email: 'tony@stark.com' },
  { id: 'c3', name: 'Wayne Ent', contactName: 'Bruce Wayne', email: 'bruce@wayne.com' },
];

export const mockInvoices = [
  { 
    id: 'inv1', clientId: 'c1', invoiceNumber: 'INV-001', issueDate: '2023-10-01', dueDate: '2023-10-15', 
    status: 'Paid', total: 1500, 
    lineItems: [{ category: 'SEO', description: 'Monthly SEO Retainer', quantity: 1, unitPrice: 1500 }] 
  },
  { 
    id: 'inv2', clientId: 'c2', invoiceNumber: 'INV-002', issueDate: '2023-11-01', dueDate: '2023-11-15', 
    status: 'Overdue', total: 2500, 
    lineItems: [{ category: 'Web Design', description: 'Landing Page Design', quantity: 1, unitPrice: 2500 }] 
  },
  { 
    id: 'inv3', clientId: 'c3', invoiceNumber: 'INV-003', issueDate: '2023-11-10', dueDate: '2023-11-24', 
    status: 'Sent', total: 1200, 
    lineItems: [{ category: 'Backend', description: 'API Integration', quantity: 1, unitPrice: 1200 }] 
  },
];

export const mockExpenses = [
  { id: 'ex1', category: 'Tools', description: 'Figma Subscription', amount: 15, date: '2023-11-02', isPaid: true },
  { id: 'ex2', category: 'Freelancers', description: 'Copywriting Contractor', amount: 500, date: '2023-11-05', isPaid: false },
];

export const mockTransactions = [
  { id: 'tx1', date: '2023-10-16', amount: 1500, type: 'Credit', description: 'Payment from Acme Corp', reconciled: true },
  { id: 'tx2', date: '2023-11-02', amount: 15, type: 'Debit', description: 'Figma *CC Hold', reconciled: true },
  { id: 'tx3', date: '2023-11-06', amount: 500, type: 'Debit', description: 'Upwork Escrow', reconciled: false },
  { id: 'tx4', date: '2023-11-12', amount: 1200, type: 'Credit', description: 'Wayne Ent Direct Dep', reconciled: false },
];
