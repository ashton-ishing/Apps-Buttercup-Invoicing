import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Plus, Send, Save, X } from 'lucide-react';

export default function InvoiceForm({ setView }) {
  const { clients, addInvoice, emailTemplate } = useApp();
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    paymentTerms: 14,
    lineItems: [{ category: 'Web Design', description: '', quantity: 1, unitPrice: 0 }]
  });

  const getDueDate = (date, terms) => {
    const result = new Date(date);
    result.setDate(result.getDate() + parseInt(terms));
    return result.toISOString().split('T')[0];
  };

  const calculateTotal = () => formData.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSave = (status) => {
    const total = calculateTotal();
    const newInvoice = {
      id: `inv${Date.now()}`,
      clientId: formData.clientId,
      invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
      issueDate: formData.issueDate,
      dueDate: getDueDate(formData.issueDate, formData.paymentTerms),
      status: status,
      total: total,
      lineItems: formData.lineItems
    };
    addInvoice(newInvoice);
    setView('invoices');
  };

  const getPreviewEmail = () => {
    const client = clients.find(c => c.id === formData.clientId);
    if (!client) return "Please select a client first.";
    
    let body = emailTemplate;
    body = body.replace('[Contact Name]', client.contactName);
    body = body.replace('[Invoice Number]', 'INV-####');
    body = body.replace('[Total]', `$${calculateTotal()}`);
    return body;
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto relative">
      <h2 className="text-2xl font-bold mb-6">New Invoice</h2>
      
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
        <button 
            onClick={() => setFormData({...formData, lineItems: [...formData.lineItems, { category: 'Web Design', description: '', quantity: 1, unitPrice: 0 }]})}
            className="mt-3 text-sm text-blue-600 flex items-center font-medium hover:underline"
        >
            <Plus size={14} className="mr-1"/> Add Line Item
        </button>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <button onClick={() => setView('invoices')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
        <div className="flex gap-3">
            <button onClick={() => handleSave('Draft')} className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                <Save size={18} className="mr-2"/> Save Draft
            </button>
            <button 
                onClick={() => {
                    if(!formData.clientId) return alert('Select a client');
                    setShowEmailModal(true);
                }} 
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
                    <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-sm text-gray-600">Back</button>
                    <button onClick={() => handleSave('Sent')} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                        Confirm & Send
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
