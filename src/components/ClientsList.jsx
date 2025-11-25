import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Users, Plus, Trash2, Search } from 'lucide-react';

export default function ClientsList() {
  const { clients, invoices, addClient, removeClient } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [newClient, setNewClient] = useState({
    name: '',
    contactName: '',
    email: ''
  });

  const calculateClientValue = (clientId) => {
    return invoices
      .filter(inv => {
        const invYear = new Date(inv.issueDate).getFullYear();
        return inv.clientId === clientId && invYear === parseInt(selectedYear);
      })
      .reduce((sum, inv) => sum + inv.total, 0);
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email) {
      setErrorMessage('Please fill in required fields (Company Name and Email)');
      return;
    }
    
    setIsAdding(true);
    setErrorMessage('');
    
    try {
      // Don't include id - let Supabase generate UUID
      await addClient(newClient);
      setNewClient({ name: '', contactName: '', email: '' });
      setShowAddModal(false);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to add client. Please try again.');
      console.error('Error adding client:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const availableYears = Array.from(
    new Set(invoices.map(inv => new Date(inv.issueDate).getFullYear()))
  ).sort((a, b) => b - a);

  // Ensure current year is always available
  if (!availableYears.includes(new Date().getFullYear())) {
    availableYears.unshift(new Date().getFullYear());
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={20} className="text-blue-600"/> Clients
            </h2>
            <select 
                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
            >
                {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
        </div>
        <button 
            onClick={() => setShowAddModal(true)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={18} /> Add Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
           <p>No clients found. Add your first client to get started.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-500 text-sm">
            <tr>
              <th className="text-left p-4">Company Name</th>
              <th className="text-left p-4">Contact Person</th>
              <th className="text-left p-4">Email</th>
              <th className="text-right p-4">Total Value ({selectedYear})</th>
              <th className="text-center p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800">{client.name}</td>
                <td className="p-4 text-gray-600">{client.contactName}</td>
                <td className="p-4 text-gray-500">{client.email}</td>
                <td className="p-4 text-right font-mono text-gray-700 font-medium">
                    ${calculateClientValue(client.id).toLocaleString()}
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => {
                        if(confirm('Are you sure? This will not delete their invoices.')) {
                            removeClient(client.id);
                        }
                    }}
                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
                <h3 className="text-xl font-bold mb-6">Add New Client</h3>
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {errorMessage}
                  </div>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={newClient.name}
                            onChange={e => {
                              setNewClient({...newClient, name: e.target.value});
                              setErrorMessage('');
                            }}
                            placeholder="e.g. Acme Corp"
                            disabled={isAdding}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={newClient.contactName}
                            onChange={e => setNewClient({...newClient, contactName: e.target.value})}
                            placeholder="e.g. John Doe"
                            disabled={isAdding}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                        <input 
                            type="email" 
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={newClient.email}
                            onChange={e => {
                              setNewClient({...newClient, email: e.target.value});
                              setErrorMessage('');
                            }}
                            placeholder="john@example.com"
                            disabled={isAdding}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                    <button 
                        onClick={() => {
                          setShowAddModal(false);
                          setErrorMessage('');
                          setNewClient({ name: '', contactName: '', email: '' });
                        }}
                        disabled={isAdding}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleAddClient}
                        disabled={isAdding}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAdding ? 'Adding...' : 'Add Client'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

