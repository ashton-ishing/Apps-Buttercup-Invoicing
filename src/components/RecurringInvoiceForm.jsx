import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Plus, Save, Calendar } from 'lucide-react';

export default function RecurringInvoiceForm({ setView }) {
  const { clients, addRecurringInvoice } = useApp();
  
  const [formData, setFormData] = useState({
    clientId: '',
    startDate: new Date().toISOString().split('T')[0],
    frequency: 'Monthly',
    paymentTerms: 14,
    includeGst: false,
    lineItems: [{ category: 'Web Design', description: '', quantity: 1, unitPrice: 0 }]
  });

  const calculateSubtotal = () => formData.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const calculateTax = () => formData.includeGst ? calculateSubtotal() * 0.1 : 0;
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const handleSave = () => {
    if(!formData.clientId) return alert('Select a client');

    const total = calculateTotal();
    const newRecurring = {
      id: `rec${Date.now()}`,
      clientId: formData.clientId,
      startDate: formData.startDate,
      frequency: formData.frequency,
      paymentTerms: formData.paymentTerms,
      nextRunDate: formData.startDate, // simplified for now
      status: 'Active',
      total: total,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      includeGst: formData.includeGst,
      lineItems: formData.lineItems
    };
    addRecurringInvoice(newRecurring);
    setView('recurring-invoices'); // Go back to recurring list
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
          <Calendar size={24} />
        </div>
        <h2 className="text-2xl font-bold">New Recurring Invoice</h2>
      </div>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <select 
            className="w-full p-2 border rounded-md"
            value={formData.frequency}
            onChange={e => setFormData({...formData, frequency: e.target.value})}
          >
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input 
            type="date" 
            className="w-full p-2 border rounded-md"
            value={formData.startDate}
            onChange={e => setFormData({...formData, startDate: e.target.value})}
          />
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
                    id="includeGstRec" 
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    checked={formData.includeGst}
                    onChange={e => setFormData({...formData, includeGst: e.target.checked})}
                />
                <label htmlFor="includeGstRec" className="ml-2 text-sm font-medium text-gray-700">Include GST (10%)</label>
            </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <button onClick={() => setView('recurring-invoices')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
        <div className="flex gap-3">
            <button 
                onClick={handleSave} 
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
                <Save size={18} className="mr-2"/> Save Recurring Profile
            </button>
        </div>
      </div>
    </div>
  );
}

