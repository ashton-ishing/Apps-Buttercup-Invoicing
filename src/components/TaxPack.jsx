import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { FileSpreadsheet, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function TaxPack() {
  const { invoices, expenses } = useApp();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Australian Financial Year: July 1 (Year-1) to June 30 (Year)
  // e.g. FY 2024 is July 1, 2023 to June 30, 2024
  const getFinancialYearDates = (year) => {
    const start = new Date(year - 1, 6, 1); // July 1st of previous year
    const end = new Date(year, 5, 30);      // June 30th of current year
    return { start, end };
  };

  const { start, end } = getFinancialYearDates(selectedYear);

  const isInFY = (dateString) => {
    const date = new Date(dateString);
    return date >= start && date <= end;
  };

  // Filter Data for Selected FY
  const fyInvoices = invoices.filter(inv => isInFY(inv.issueDate) && inv.status !== 'Draft');
  const fyExpenses = expenses.filter(exp => isInFY(exp.date));

  // Calculate Totals
  const totalIncome = fyInvoices.reduce((sum, inv) => sum + inv.total, 0);
  // Use the 'tax' field if it exists (from your update), otherwise estimate 0
  const gstCollected = fyInvoices.reduce((sum, inv) => sum + (inv.tax || 0), 0);
  
  const totalExpenses = fyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  // Estimate GST on expenses (1/11th rule for AU if inclusive) or 0 if no tax field
  const gstPaid = totalExpenses / 11; 

  const netProfit = totalIncome - totalExpenses;

  // Group Expenses by Category
  const expensesByCategory = fyExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const availableYears = Array.from(new Set([
    ...invoices.map(inv => new Date(inv.issueDate).getFullYear()),
    ...expenses.map(exp => new Date(exp.date).getFullYear()),
    new Date().getFullYear()
  ])).sort((a, b) => b - a);
  // Adjust to FY logic (if date is > June, it's next FY)
  const fyOptions = Array.from(new Set(availableYears.map(y => y + 1))).sort((a,b) => b-a);


  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileSpreadsheet className="text-green-600" /> Tax Pack (Australia)
        </h2>
        <div className="flex gap-3">
          <select 
            className="bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-2 font-medium focus:ring-2 focus:ring-green-500 outline-none"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {fyOptions.map(year => (
              <option key={year} value={year}>FY {year} (July {year-1} - June {year})</option>
            ))}
          </select>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800">
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-500"/> Total Income
          </div>
          <div className="text-2xl font-bold">${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="text-xs text-gray-400 mt-1">Inc. GST</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
            <TrendingDown size={16} className="text-red-500"/> Total Deductions
          </div>
          <div className="text-2xl font-bold">${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="text-xs text-gray-400 mt-1">Inc. GST</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
            <DollarSign size={16} className="text-blue-500"/> Net Profit
          </div>
          <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </div>
          <div className="text-xs text-gray-400 mt-1">Taxable Income</div>
        </div>

        <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 shadow-sm">
          <div className="text-purple-800 text-sm font-medium mb-1">Est. GST to Pay</div>
          <div className="text-2xl font-bold text-purple-900">
            ${Math.max(0, gstCollected - gstPaid).toLocaleString(undefined, {minimumFractionDigits: 2})}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            Collected: ${gstCollected.toFixed(0)} | Paid: ${gstPaid.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Income Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-600">Gross Sales</span>
              <span className="font-medium">${(totalIncome - gstCollected).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-600">GST Collected (10%)</span>
              <span className="font-medium">${gstCollected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 font-bold bg-gray-50 px-2 rounded mt-2">
              <span>Total Invoiced</span>
              <span>${totalIncome.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Expense Categories</h3>
          <div className="space-y-3">
             {Object.keys(expensesByCategory).length === 0 ? (
                 <p className="text-gray-400 text-sm italic">No expenses recorded for this period.</p>
             ) : (
                 Object.entries(expensesByCategory).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                            <span className="text-gray-600">{category}</span>
                        </div>
                        <span className="font-medium">${amount.toLocaleString()}</span>
                    </div>
                 ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

