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

  // Company Info (Top Right - far right aligned)
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  const companyX = pageWidth - rightMargin; // Far right aligned
  doc.text(companyInfo.name, companyX, currentY, { align: 'right' });
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  if (companyInfo.abn) {
    doc.text(companyInfo.abn, companyX, currentY + 6, { align: 'right' });
  }

  // Add 2cm space below company info
  currentY += 26; // 6 (ABN line) + 20 (2cm spacing)

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
  currentY -= 15; // Moved up by 2cm (20mm) from original position
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
  currentY += 50; // Increased spacing to shift table down
  const tableColumns = ["Service date", "Item", "Description", "Quantity", "Amount"];
  const tableRows = [];

  invoice.lineItems.forEach(item => {
    const invoiceData = [
      formatDate(invoice.issueDate), // Service date
      item.category || 'Service',
      item.description || '',
      item.quantity.toString(),
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
          fontSize: 9,
          4: { halign: 'right' } // Right align Amount header (now column 4)
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 28 }, // Service date
          1: { cellWidth: 35 }, // Item
          2: { cellWidth: 60 }, // Description
          3: { cellWidth: 20, halign: 'right' }, // Quantity
          4: { cellWidth: 30, halign: 'right' } // Amount
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
    doc.text(tableColumns[0], leftMargin + 2, tableY + 6); // Service date
    doc.text(tableColumns[1], leftMargin + 32, tableY + 6); // Item
    doc.text(tableColumns[2], leftMargin + 70, tableY + 6); // Description
    doc.text(tableColumns[3], leftMargin + 135, tableY + 6, { align: 'right' }); // Quantity
    doc.text(tableColumns[4], pageWidth - rightMargin - 2, tableY + 6, { align: 'right' }); // Amount
    tableY += 10;
    
    // Draw rows
    doc.setFont(undefined, 'normal');
    tableRows.forEach(row => {
      doc.text(row[0], leftMargin + 2, tableY + 6); // Service date
      doc.text(row[1], leftMargin + 32, tableY + 6); // Item
      doc.text(row[2], leftMargin + 70, tableY + 6); // Description
      doc.text(row[3], leftMargin + 135, tableY + 6, { align: 'right' }); // Quantity
      doc.text(row[4], pageWidth - rightMargin - 2, tableY + 6, { align: 'right' }); // Amount
      tableY += 8;
    });
    
    finalY = tableY + 5;
  }
  
  // Add extra space between table and balance section
  finalY += 15;
  
  // Payment Summary (Bottom Right)
  const summaryX = pageWidth - rightMargin - 75;
  const summaryBoxWidth = 75;
  
  doc.setFontSize(9);
  doc.setTextColor(0);
  
  // Calculate amounts
  const subtotal = invoice.subtotal || invoice.total;
  const gstAmount = invoice.tax || 0;
  const balanceDue = invoice.total;
  
  // Show Subtotal if GST is included
  if (invoice.includeGst && gstAmount > 0) {
    doc.setFont(undefined, 'normal');
    doc.text(`Subtotal`, summaryX, finalY);
    doc.text(`$${subtotal.toFixed(2)}`, summaryX + summaryBoxWidth - 4, finalY, { align: 'right' });
    finalY += 6;
  }
  
  // Show GST line above balance (always show if there's a GST amount)
  if (gstAmount > 0) {
    doc.setFont(undefined, 'normal');
    doc.text(`GST (10%)`, summaryX, finalY);
    doc.text(`$${gstAmount.toFixed(2)}`, summaryX + summaryBoxWidth - 4, finalY, { align: 'right' });
    finalY += 8;
  }
  
  // Balance due (highlighted)
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
  doc.text(`Description: ${invoice.invoiceNumber}`, leftMargin, finalY + 30);

  return doc;
};
