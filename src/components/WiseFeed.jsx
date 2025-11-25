import React, { useState, useRef } from 'react';
import { useApp } from '../AppContext';
import { CheckCircle, RefreshCcw, ArrowRight, Upload } from 'lucide-react';

export default function WiseFeed() {
  const { supabase, transactions, setTransactions, invoices, expenses, reconcileTransaction } = useApp();
  const [selectedTx, setSelectedTx] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const fileInputRef = useRef(null);

  const parseWiseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Map CSV headers to our keys based on screenshot
    // TransferWise ID, Date, Date Time, Amount, Currency, Description
    const getIndex = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    
    const idIdx = getIndex('TransferWise ID');
    const dateIdx = getIndex('Date');
    const amountIdx = getIndex('Amount');
    const currencyIdx = getIndex('Currency');
    const descIdx = getIndex('Description');

    if (idIdx === -1 || amountIdx === -1) {
        throw new Error("Invalid CSV format. Could not find required columns.");
    }

    return lines.slice(1).map(line => {
        // Handle simple comma splitting (caveat: doesn't handle quoted commas correctly, but Wise CSVs are usually simple)
        const cols = line.split(',').map(c => c.trim());
        if (cols.length < headers.length) return null;

        const id = cols[idIdx];
        const description = cols[descIdx] || 'Unknown';
        
        // Filter out internal balance transfers/conversions
        if (id.startsWith('BALANCE-') || description.startsWith('Converted') || description.startsWith('Wise Charges for: BALANCE')) {
            return null;
        }

        const amount = parseFloat(cols[amountIdx]);
        const type = amount > 0 ? 'Credit' : 'Debit';

        return {
            id: id,
            date: cols[dateIdx], // Assuming DD-MM-YYYY from screenshot
            amount: Math.abs(amount),
            type: type,
            description: description,
            currency: cols[currencyIdx],
            reconciled: false
        };
    }).filter(tx => tx !== null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const newTransactions = parseWiseCSV(text);
            
            // Merge with existing transactions (avoid duplicates by ID)
            setTransactions(prev => {
                const existingIds = new Set(prev.map(t => t.id));
                const uniqueNew = newTransactions.filter(t => !existingIds.has(t.id));
                return [...uniqueNew, ...prev].sort((a, b) => new Date(b.date.split('-').reverse().join('-')) - new Date(a.date.split('-').reverse().join('-')));
            });
            
            setInfoMessage(`Imported ${newTransactions.length} transactions from CSV.`);
            setError(null);
        } catch (err) {
            setError("Failed to parse CSV: " + err.message);
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = null;
  };

  const fetchWiseTransactions = async () => {
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-wise-transactions');
      
      // Check for error even if status is 200 (as per our Edge Function change)
      if (data?.error) {
         throw new Error(data.error);
      }

      if (error) {
        // Try to parse the error context or body if available
        const errorMessage = error.context?.json?.error || error.message || 'Unknown error occurred';
        throw new Error(errorMessage);
      }

      if (data?.data) {
          if (data.data.length === 0) {
             setInfoMessage(data.debug || 'No transactions found in the last 90 days.');
          } else {
             setTransactions(data.data);
          }
      }
    } catch (err) {
      console.error('Wise Fetch Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const unpaidInvoices = invoices.filter(i => i.status !== 'Paid');
  const unpaidExpenses = expenses.filter(e => !e.isPaid);

  const matches = selectedTx ? (
    selectedTx.type === 'Credit' 
      ? unpaidInvoices.filter(i => i.total === selectedTx.amount)
      : unpaidExpenses.filter(e => e.amount === selectedTx.amount)
  ) : [];

  return (
    <div className="h-[calc(100vh-100px)] grid grid-cols-12 gap-6">
      <div className="col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Wise Bank Feed</h3>
            <div className="flex gap-2">
                <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                />
                <button 
                    onClick={() => fileInputRef.current.click()} 
                    className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-50 flex items-center gap-1 transition-colors"
                >
                    <Upload size={12}/> Import CSV
                </button>
                <button 
                    onClick={fetchWiseTransactions} 
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 flex items-center gap-1"
                    disabled={isLoading}
                >
                    {isLoading ? <RefreshCcw size={10} className="animate-spin"/> : <RefreshCcw size={10}/>}
                    {isLoading ? 'Syncing...' : 'Sync'}
                </button>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Live</span>
            </div>
        </div>
        {error && <div className="p-2 bg-red-50 text-red-600 text-xs border-b border-red-100">{error}</div>}
        {infoMessage && <div className="p-2 bg-yellow-50 text-yellow-700 text-xs border-b border-yellow-100">{infoMessage}</div>}
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {transactions.map(tx => (
                <div 
                    key={tx.id}
                    onClick={() => !tx.reconciled && setSelectedTx(tx)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${
                        tx.reconciled ? 'bg-gray-50 border-gray-100 opacity-60' : 
                        selectedTx?.id === tx.id ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                >
                    <div className="flex justify-between mb-1">
                        <div className="flex flex-col">
                            <span className="font-semibold text-gray-800">{tx.description}</span>
                            {tx.currency && <span className="text-xs text-gray-400">{tx.currency}</span>}
                        </div>
                        <span className={`font-bold ${tx.type === 'Credit' ? 'text-green-600' : 'text-gray-800'}`}>
                            {tx.type === 'Credit' ? '+' : '-'}{tx.amount}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{tx.date}</span>
                        {tx.reconciled && <span className="flex items-center text-green-600"><CheckCircle size={12} className="mr-1"/> Reconciled</span>}
                    </div>
                </div>
            ))}
        </div>
      </div>

      <div className="col-span-7 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center p-6">
        {!selectedTx ? (
            <div className="text-center text-gray-400">
                <RefreshCcw size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a transaction to reconcile</p>
            </div>
        ) : (
            <div className="w-full max-w-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                    Reconciling <span className="text-blue-600">{selectedTx.amount} {selectedTx.currency}</span> ({selectedTx.type})
                </h3>

                {matches.length === 0 ? (
                    <div className="text-center p-8 bg-white rounded-lg shadow border">
                        <p className="text-red-500 mb-2">No exact matches found.</p>
                        <p className="text-sm text-gray-500">Create an invoice or expense manually to match.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Suggested Matches</p>
                        {matches.map(match => (
                            <div key={match.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-800">
                                        {selectedTx.type === 'Credit' ? `Invoice ${match.invoiceNumber}` : match.description}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {selectedTx.type === 'Credit' ? 'Due: ' + match.dueDate : 'Date: ' + match.date}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => {
                                        reconcileTransaction(selectedTx.id, match.id, selectedTx.type === 'Credit' ? 'invoice' : 'expense');
                                        setSelectedTx(null);
                                    }}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
                                >
                                    Match <ArrowRight size={16} className="ml-2"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
