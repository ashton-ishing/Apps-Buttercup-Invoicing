import React, { useState } from 'react';
import { AppProvider, useApp } from './AppContext';
import { supabase } from './supabaseClient';
import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/clerk-react";
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import RecurringInvoiceForm from './components/RecurringInvoiceForm';
import ClientsList from './components/ClientsList';
import TaxPack from './components/TaxPack';
import WiseFeed from './components/WiseFeed';
import Auth from './components/Auth';
import { LayoutDashboard, FileText, CreditCard, Settings, PlusCircle, Repeat, Users, FileSpreadsheet, LogOut, Edit, Eye, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

const RecurringInvoiceList = ({ setView }) => {
  const { recurringInvoices, clients } = useApp();
  
  const getClientName = (id) => clients.find(c => c.id === id)?.name || 'Unknown';

  const handleEdit = (invoice) => {
    if (typeof setView === 'function') {
      setView({ view: 'edit-recurring-invoice', invoice });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Repeat size={20} className="text-purple-600"/> Recurring Invoices
        </h2>
        <div className="flex gap-3">
           <button onClick={() => setView('invoices')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">
             Back to Invoices
           </button>
           <button onClick={() => setView('create-recurring-invoice')} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700">
             <PlusCircle size={18} /> Create Recurring
           </button>
        </div>
      </div>
      {recurringInvoices.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
           <p>No recurring invoices set up yet.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-500 text-sm">
            <tr>
              <th className="text-left p-4">Client</th>
              <th className="text-left p-4">Frequency</th>
              <th className="text-left p-4">Start Date</th>
              <th className="text-right p-4">Amount</th>
              <th className="text-center p-4">Status</th>
              <th className="text-center p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recurringInvoices.map(inv => (
              <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-700">{getClientName(inv.clientId)}</td>
                <td className="p-4 text-gray-600">{inv.frequency}</td>
                <td className="p-4 text-gray-500 text-sm">{inv.startDate}</td>
                <td className="p-4 text-right font-mono text-gray-700">${inv.total}</td>
                <td className="p-4 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    {inv.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleEdit(inv)}
                    className="text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded-full transition-colors"
                    title="Edit recurring invoice"
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const InvoiceList = ({ setView }) => {
  const { invoices, clients, updateInvoiceStatus } = useApp();
  const [updatingStatus, setUpdatingStatus] = useState({});
  
  const getClientName = (id) => clients.find(c => c.id === id)?.name || 'Unknown';
  const getClient = (id) => clients.find(c => c.id === id);
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleViewPDF = async (invoice) => {
    try {
      const client = getClient(invoice.clientId);
      if (!client) {
        alert('Client not found');
        return;
      }

      // Dynamically import PDF generator
      const { generateInvoicePDF } = await import('./utils/pdfGenerator');
      
      // Generate PDF
      const doc = await generateInvoicePDF(invoice, client);
      
      // Open PDF in new window
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    } catch (error) {
      alert('Error generating PDF: ' + error.message);
      console.error('PDF generation error:', error);
    }
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    setUpdatingStatus({ ...updatingStatus, [invoiceId]: true });
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
    } catch (error) {
      alert('Error updating status: ' + error.message);
      console.error('Status update error:', error);
    } finally {
      setUpdatingStatus({ ...updatingStatus, [invoiceId]: false });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Invoices</h2>
        <div className="flex gap-3">
            <button onClick={() => setView('recurring-invoices')} className="text-purple-700 bg-purple-50 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-100 border border-purple-100 font-medium">
              <Repeat size={16} /> Recurring Invoices
            </button>
            <button onClick={() => setView('create-invoice')} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
              <PlusCircle size={18} /> Create New
            </button>
        </div>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50 text-gray-500 text-sm">
          <tr>
            <th className="text-left p-4">Number</th>
            <th className="text-left p-4">Client</th>
            <th className="text-left p-4">Date</th>
            <th className="text-right p-4">Total</th>
            <th className="text-center p-4">Status</th>
            <th className="text-center p-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50">
              <td className="p-4 font-medium text-gray-700">{inv.invoiceNumber}</td>
              <td className="p-4 text-gray-600">{getClientName(inv.clientId)}</td>
              <td className="p-4 text-gray-500 text-sm">{inv.dueDate}</td>
              <td className="p-4 text-right font-mono text-gray-700">${inv.total}</td>
              <td className="p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <select
                    value={inv.status}
                    onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                    disabled={updatingStatus[inv.id]}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none ${getStatusColor(inv.status)} ${updatingStatus[inv.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </td>
              <td className="p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleViewPDF(inv)}
                    className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-full transition-colors"
                    title="View PDF"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SettingsView = () => {
  const { emailTemplate, setEmailTemplate, googleScriptUrl, setGoogleScriptUrl, saveSettings } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      await saveSettings(emailTemplate, googleScriptUrl);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(`Error: ${error.message || 'Failed to save settings'}`);
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white p-8 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Settings className="w-6 h-6 text-gray-500"/> Configuration
      </h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Static Email Description Template</label>
        <p className="text-xs text-gray-500 mb-2">
          This text will be applied to all invoice emails. You can use placeholders like <code className="bg-gray-100 p-0.5 rounded">[Contact Name]</code>, <code className="bg-gray-100 p-0.5 rounded">[Invoice Number]</code>, and <code className="bg-gray-100 p-0.5 rounded">[Total]</code>.
        </p>
        <textarea 
          className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
          value={emailTemplate}
          onChange={(e) => setEmailTemplate(e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700 mb-2">Google Script Webhook URL</label>
        <p className="text-xs text-gray-500 mb-2">
           Paste the Web App URL from your deployed Google Apps Script here. This enables automated emailing, Drive saving, and Sheet logging.
        </p>
        <input 
          type="text" 
          className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://script.google.com/macros/s/..."
          value={googleScriptUrl}
          onChange={(e) => setGoogleScriptUrl(e.target.value)}
        />
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        {saveMessage && (
          <span className={`text-sm ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingInvoice, setEditingInvoice] = useState(null);
  const { signOut } = useClerk();

  const handleLogout = async () => {
    await signOut();
  };

  const handleViewChange = (view) => {
    if (typeof view === 'object' && view.view === 'edit-recurring-invoice') {
      setEditingInvoice(view.invoice);
      setActiveTab('edit-recurring-invoice');
    } else {
      setEditingInvoice(null);
      setActiveTab(view);
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'invoices': return <InvoiceList setView={handleViewChange} />;
      case 'create-invoice': return <InvoiceForm setView={handleViewChange} />;
      case 'recurring-invoices': return <RecurringInvoiceList setView={handleViewChange} />;
      case 'create-recurring-invoice': return <RecurringInvoiceForm setView={handleViewChange} />;
      case 'edit-recurring-invoice': return <RecurringInvoiceForm setView={handleViewChange} invoiceToEdit={editingInvoice} />;
      case 'clients': return <ClientsList />;
      case 'tax-pack': return <TaxPack />;
      case 'wise': return <WiseFeed />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  const NavItem = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out",
        activeTab === id || (['invoices', 'create-invoice', 'recurring-invoices', 'create-recurring-invoice', 'edit-recurring-invoice'].includes(activeTab) && id === 'invoices') 
          ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50" 
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
      )}
    >
      <Icon size={18} strokeWidth={2} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex text-gray-800 font-sans">
      <aside className="w-64 bg-[#F8F9FA] fixed h-full z-10 flex flex-col">
        <div className="p-6 mb-2">
          <div className="flex items-center gap-3">
             <img src="https://7ui4aegvhooyq7am.public.blob.vercel-storage.com/buttercup-logo.png" alt="Buttercup Logo" className="h-10 w-auto object-contain" />
          </div>
        </div>
        <nav className="px-4 space-y-1 flex-1">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="invoices" icon={FileText} label="Invoices" />
          <NavItem id="clients" icon={Users} label="Clients" />
          <NavItem id="tax-pack" icon={FileSpreadsheet} label="Tax Pack" />
          <NavItem id="wise" icon={CreditCard} label="Wise Feed" />
        </nav>
        <div className="p-4 mt-auto border-t border-gray-100 space-y-1">
          <NavItem id="settings" icon={Settings} label="Settings" />
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 ease-in-out"
          >
            <LogOut size={18} strokeWidth={2} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-10">
        <div className="max-w-5xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <SignedIn>
        <MainApp />
      </SignedIn>
      <SignedOut>
        <Auth />
      </SignedOut>
    </AppProvider>
  );
}
