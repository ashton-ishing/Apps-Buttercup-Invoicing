import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, AlertCircle, Clock, ChevronDown } from 'lucide-react';

const DateRangeSelector = () => {
  const { dateRange, setDateRange } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomMonths, setShowCustomMonths] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState([]);

  const options = [
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
    { label: 'Last 120 Days', value: 120 },
  ];

  // Generate last 24 months
  const getRecentMonths = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      months.push({
        id: d.getTime(),
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
        value: 'custom-months',
        startDate: new Date(d.getFullYear(), d.getMonth(), 1),
        endDate: new Date(d.getFullYear(), d.getMonth() + 1, 0)
      });
    }
    return months;
  };

  const handleMonthToggle = (month) => {
    const isSelected = selectedMonths.some(m => m.id === month.id);
    let newSelection;
    if (isSelected) {
      newSelection = selectedMonths.filter(m => m.id !== month.id);
    } else {
      newSelection = [...selectedMonths, month];
    }
    setSelectedMonths(newSelection);
  };

  const applyCustomMonths = () => {
    if (selectedMonths.length === 0) return;
    
    setDateRange({
      label: `${selectedMonths.length} Months Selected`,
      value: 'custom-months',
      selectedMonths: selectedMonths
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          setShowCustomMonths(false);
        }}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm hover:border-gray-300 transition-all"
      >
        {dateRange.label}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
            {!showCustomMonths ? (
              <>
                {options.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setDateRange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      dateRange.label === opt.label ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="h-px bg-gray-100 my-1" />
                <button
                  onClick={() => setShowCustomMonths(true)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex justify-between items-center"
                >
                  Select Months
                  <ChevronDown size={14} className="-rotate-90 text-gray-400" />
                </button>
              </>
            ) : (
              <div className="flex flex-col h-full max-h-96">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 bg-gray-50/50">
                  <button
                    onClick={() => setShowCustomMonths(false)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 uppercase tracking-wider"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={applyCustomMonths}
                    disabled={selectedMonths.length === 0}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
                <div className="overflow-y-auto flex-1">
                  {getRecentMonths().map((month) => {
                    const isSelected = selectedMonths.some(m => m.id === month.id);
                    return (
                      <button
                        key={month.id}
                        onClick={() => handleMonthToggle(month)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                          isSelected ? 'bg-blue-50/50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                        </div>
                        {month.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const KPICard = ({ title, amount, icon: Icon, trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 hover:border-gray-200 transition-colors">
    <div className="flex items-start justify-between mb-4">
      <div className="p-2 bg-gray-50 rounded-xl text-gray-500">
        <Icon size={20} strokeWidth={1.5} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-semibold text-gray-900 tracking-tight">${amount.toLocaleString()}</h3>
    </div>
  </div>
);

export default function Dashboard() {
  const { invoices, expenses, dateRange } = useApp();

  const filterByDate = (items, dateField) => {
    if (dateRange.value === 'custom-months' && dateRange.selectedMonths) {
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        return dateRange.selectedMonths.some(month => 
          itemDate >= month.startDate && itemDate <= month.endDate
        );
      });
    }
    
    if (dateRange.value === 'custom' && dateRange.startDate && dateRange.endDate) {
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
      });
    }
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange.value);
    
    return items.filter(item => new Date(item[dateField]) >= cutoff);
  };

  const filteredInvoices = filterByDate(invoices, 'issueDate');
  const filteredExpenses = filterByDate(expenses, 'date');

  const totalRevenue = filteredInvoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.total, 0);
  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const outstanding = filteredInvoices.filter(i => i.status === 'Sent').reduce((acc, curr) => acc + curr.total, 0);
  const overdue = filteredInvoices.filter(i => i.status === 'Overdue').reduce((acc, curr) => acc + curr.total, 0);

  const data = [
    { name: 'Revenue', value: totalRevenue, color: '#10b981' },
    { name: 'Expenses', value: totalExpenses, color: '#f43f5e' },
    { name: 'Outstanding', value: outstanding, color: '#6366f1' },
    { name: 'Overdue', value: overdue, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h2>
        <DateRangeSelector />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="Total Revenue" amount={totalRevenue} icon={DollarSign} trend={12} />
        <KPICard title="Total Expenses" amount={totalExpenses} icon={TrendingUp} trend={-5} />
        <KPICard title="Outstanding" amount={outstanding} icon={Clock} />
        <KPICard title="Overdue" amount={overdue} icon={AlertCircle} />
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
