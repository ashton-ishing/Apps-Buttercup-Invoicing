import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { CheckCircle, RefreshCcw, ArrowRight } from 'lucide-react';

export default function WiseFeed() {
  const { transactions, invoices, expenses, reconcileTransaction } = useApp();
  const [selectedTx, setSelectedTx] = useState(null);

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
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Live</span>
        </div>
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
                        <span className="font-semibold text-gray-800">{tx.description}</span>
                        <span className={`font-bold ${tx.type === 'Credit' ? 'text-green-600' : 'text-gray-800'}`}>
                            {tx.type === 'Credit' ? '+' : '-'}${tx.amount}
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
                    Reconciling <span className="text-blue-600">${selectedTx.amount}</span> ({selectedTx.type})
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
