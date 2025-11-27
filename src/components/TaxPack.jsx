import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { FileSpreadsheet, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function TaxPack() {
  const { invoices, expenses } = useApp();
  
  // Debug logging
  useEffect(() => {
    console.log('TaxPack Debug:', {
      totalInvoices: invoices.length,
      invoices: invoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        status: inv.status,
        total: inv.total
      })),
      totalExpenses: expenses.length
    });
  }, [invoices, expenses]);
  
  // Calculate available financial years from invoices/expenses
  const availableYears = Array.from(new Set([
    ...invoices.map(inv => {
      if (!inv.issueDate) return null;
      const date = new Date(inv.issueDate);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11, where 6 = July
      // If date is July or later, it's in the next FY
      return month >= 6 ? year + 1 : year;
    }).filter(y => y !== null),
    ...expenses.map(exp => {
      if (!exp.date) return null;
      const date = new Date(exp.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      return month >= 6 ? year + 1 : year;
    }).filter(y => y !== null),
    // Always include current FY
    (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      return month >= 6 ? year + 1 : year;
    })()
  ])).sort((a, b) => b - a);
  
  // Default to current financial year
  const currentFY = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return month >= 6 ? year + 1 : year;
  })();
  
  const [selectedYear, setSelectedYear] = useState(availableYears.length > 0 ? availableYears[0] : currentFY);

  // Australian Financial Year: July 1 (Year-1) to June 30 (Year)
  // e.g. FY 2026 is July 1, 2025 to June 30, 2026
  const getFinancialYearDates = (year) => {
    const start = new Date(year - 1, 6, 1); // July 1st of previous year
    const end = new Date(year, 5, 30);      // June 30th of current year
    return { start, end };
  };

  const { start, end } = getFinancialYearDates(selectedYear);

  const isInFY = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return false;
    // Set time to start of day for accurate comparison
    date.setHours(0, 0, 0, 0);
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    return date >= startDate && date <= endDate;
  };

  // Filter Data for Selected FY
  const fyInvoices = invoices.filter(inv => {
    if (!inv.issueDate) {
      console.log('Invoice missing issueDate:', inv.invoiceNumber);
      return false;
    }
    if (inv.status === 'Draft') {
      console.log('Invoice is Draft, excluding:', inv.invoiceNumber);
      return false;
    }
    const inRange = isInFY(inv.issueDate);
    if (!inRange) {
      console.log('Invoice not in FY range:', inv.invoiceNumber, inv.issueDate, 'FY:', selectedYear, 'Range:', start, 'to', end);
    }
    return inRange;
  });
  const fyExpenses = expenses.filter(exp => exp.date && isInFY(exp.date));
  
  // Debug filtered results
  useEffect(() => {
    console.log('TaxPack Filtered Results:', {
      selectedYear,
      fyRange: { start: start.toISOString(), end: end.toISOString() },
      fyInvoicesCount: fyInvoices.length,
      fyInvoices: fyInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        total: inv.total,
        tax: inv.tax
      })),
      totalIncome,
      gstCollected
    });
  }, [selectedYear, fyInvoices, totalIncome, gstCollected, start, end]);

  // Calculate Totals - ensure numeric conversion
  const totalIncome = fyInvoices.reduce((sum, inv) => {
    const total = parseFloat(inv.total) || 0;
    return sum + total;
  }, 0);
  // Use the 'tax' field if it exists (from your update), otherwise estimate 0
  const gstCollected = fyInvoices.reduce((sum, inv) => {
    const tax = parseFloat(inv.tax) || 0;
    return sum + tax;
  }, 0);
  
  const totalExpenses = fyExpenses.reduce((sum, exp) => {
    const amount = parseFloat(exp.amount) || 0;
    return sum + amount;
  }, 0);
  // Estimate GST on expenses (1/11th rule for AU if inclusive) or 0 if no tax field
  const gstPaid = totalExpenses / 11; 

  const netProfit = totalIncome - totalExpenses;

  // Group Expenses by Category
  const expensesByCategory = fyExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  // Use the availableYears calculated above
  const fyOptions = availableYears.length > 0 ? availableYears : [currentFY];


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

