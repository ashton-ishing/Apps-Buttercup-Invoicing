import jsPDF from 'jspdf';
import 'jspdf-autotable';

const getBase64ImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = (error) => {
      reject(error);
    };
  });
};

export const generateInvoicePDF = async (invoice, client) => {
  const doc = new jsPDF();
  const pageWidth = 210; // A4 width in mm
  const leftMargin = 14;
  const rightMargin = 14;
  let currentY = 10;

  // Company information (you can move this to settings later)
  const companyInfo = {
    name: 'Buttercup Digital',
    abn: 'ABN: 23 925 385 136'
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Add Logo (Top Left)
  const logoUrl = "https://7ui4aegvhooyq7am.public.blob.vercel-storage.com/buttercup-logo.png";
  try {
      const logoBase64 = await getBase64ImageFromURL(logoUrl);
      const img = new Image();
      img.src = logoBase64;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const maxWidth = 70;
      const maxHeight = 28;
      const aspectRatio = img.width / img.height;
      
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;
      
      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }
      
      doc.addImage(logoBase64, 'PNG', leftMargin, currentY, logoWidth, logoHeight);
      currentY += logoHeight + 8;
  } catch (e) {
      console.warn("Could not load logo:", e);
      currentY += 20; // Add space if logo fails
  }

  // Company Info (Top Right)
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  const companyX = pageWidth - rightMargin - 80; // Right aligned
  doc.text(companyInfo.name, companyX, currentY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  if (companyInfo.abn) {
    doc.text(companyInfo.abn, companyX, currentY + 6);
  }

  // Invoice Title (Below Logo)
  currentY += 15;
  doc.setFontSize(24);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text("Invoice", leftMargin, currentY);
  currentY += 12;

  // Invoice Details Box (Right Side)
  const boxWidth = 80;
  const boxX = pageWidth - rightMargin - boxWidth;
  const boxStartY = currentY - 8;
  const boxHeight = 20; // Reduced height since labels and values are on same line
  
  // Draw grey box background
  doc.setFillColor(245, 245, 245);
  doc.rect(boxX, boxStartY, boxWidth, boxHeight, 'F');
  
  // Box border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxStartY, boxWidth, boxHeight);
  
  // Box content - labels on left, values on right
  doc.setFontSize(9);
  doc.setTextColor(0);
  let boxY = boxStartY + 6;
  
  // Date: label left, value right
  doc.setFont(undefined, 'bold');
  doc.text("Date", boxX + 3, boxY);
  doc.setFont(undefined, 'normal');
  doc.text(formatDate(invoice.issueDate), boxX + boxWidth - 3, boxY, { align: 'right' });
  
  // Invoice #: label left, value right
  boxY += 6;
  doc.setFont(undefined, 'bold');
  doc.text("Invoice #", boxX + 3, boxY);
  doc.setFont(undefined, 'normal');
  doc.text(invoice.invoiceNumber, boxX + boxWidth - 3, boxY, { align: 'right' });
  
  // Due date: label left, value right
  boxY += 6;
  doc.setFont(undefined, 'bold');
  doc.text("Due date", boxX + 3, boxY);
  doc.setFont(undefined, 'normal');
  doc.text(formatDate(invoice.dueDate), boxX + boxWidth - 3, boxY, { align: 'right' });

  // Invoice To Section (Left Side)
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text("Invoice to:", leftMargin, currentY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(client.name, leftMargin, currentY + 6);
  if (client.contactName) {
    doc.text(client.contactName, leftMargin, currentY + 12);
  }
  if (client.email) {
    doc.text(client.email, leftMargin, currentY + 18);
  }

  // Service Table
  currentY += 30;
  const tableColumns = ["Service date", "Item", "Description", "Amount"];
  const tableRows = [];

  invoice.lineItems.forEach(item => {
    const invoiceData = [
      formatDate(invoice.issueDate), // Service date
      item.category || 'Service',
      item.description || '',
      `$${parseFloat(item.quantity * item.unitPrice).toFixed(2)}`
    ];
    tableRows.push(invoiceData);
  });

  // Use autoTable plugin
  let finalY;
  try {
    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: currentY,
        head: [tableColumns],
        body: tableRows,
        headStyles: { 
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 80 },
          3: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: leftMargin, right: rightMargin }
      });
      finalY = doc.lastAutoTable.finalY + 10;
    } else {
      throw new Error('autoTable plugin not loaded');
    }
  } catch (error) {
    // Fallback: Draw table manually
    console.warn('autoTable not available, drawing table manually:', error);
    let tableY = currentY;
    doc.setFontSize(9);
    
    // Draw header
    doc.setFillColor(240, 240, 240);
    doc.rect(leftMargin, tableY, pageWidth - leftMargin - rightMargin, 8, 'F');
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(tableColumns[0], leftMargin + 2, tableY + 6);
    doc.text(tableColumns[1], leftMargin + 35, tableY + 6);
    doc.text(tableColumns[2], leftMargin + 80, tableY + 6);
    doc.text(tableColumns[3], pageWidth - rightMargin - 30, tableY + 6, { align: 'right' });
    tableY += 10;
    
    // Draw rows
    doc.setFont(undefined, 'normal');
    tableRows.forEach(row => {
      doc.text(row[0], leftMargin + 2, tableY + 6);
      doc.text(row[1], leftMargin + 35, tableY + 6);
      doc.text(row[2], leftMargin + 80, tableY + 6);
      doc.text(row[3], pageWidth - rightMargin - 30, tableY + 6, { align: 'right' });
      tableY += 8;
    });
    
    finalY = tableY + 5;
  }
  
  // Payment Summary (Bottom Right)
  const summaryX = pageWidth - rightMargin - 75;
  const summaryBoxWidth = 75;
  
  // Balance due (highlighted)
  const balanceDue = invoice.total;
  const balanceAmount = `$${balanceDue.toFixed(2)}`;
  doc.setFillColor(60, 60, 60);
  doc.rect(summaryX - 2, finalY - 5, summaryBoxWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  // Position "Balance due" on left
  doc.text(`Balance due`, summaryX, finalY);
  // Position amount on right with proper spacing
  const amountX = summaryX + summaryBoxWidth - 4;
  doc.text(balanceAmount, amountX, finalY, { align: 'right' });
  
  // Payment Instructions (Bottom Left)
  finalY += 20;
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text("How to pay", leftMargin, finalY);
  doc.setFont(undefined, 'normal');
  doc.text("Please make payment by the Due Date to:", leftMargin, finalY + 6);
  doc.text("Ashton Maloney", leftMargin, finalY + 12);
  doc.text("BSB: 774-001", leftMargin, finalY + 18);
  doc.text("ACC: 23-652-1647", leftMargin, finalY + 24);

  return doc;
};
