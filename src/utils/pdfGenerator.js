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

  // Add Logo
  const logoUrl = "https://7ui4aegvhooyq7am.public.blob.vercel-storage.com/buttercup-logo.png";
  try {
      const logoBase64 = await getBase64ImageFromURL(logoUrl);
      doc.addImage(logoBase64, 'PNG', 140, 10, 50, 20); // Right aligned logo
  } catch (e) {
      console.warn("Could not load logo:", e);
  }

  // Add Header
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text("INVOICE", 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 14, 30);
  doc.text(`Date: ${invoice.issueDate}`, 14, 35);
  doc.text(`Due Date: ${invoice.dueDate}`, 14, 40);

  // Client Details
  doc.setFontSize(12);
  doc.text("Bill To:", 14, 55);
  doc.setFontSize(10);
  doc.text(client.name, 14, 62);
  doc.text(client.contactName, 14, 67);
  doc.text(client.email, 14, 72);

  // Table
  const tableColumn = ["Description", "Quantity", "Unit Price", "Total"];
  const tableRows = [];

  invoice.lineItems.forEach(item => {
    const invoiceData = [
      item.description || item.category,
      item.quantity,
      `$${item.unitPrice.toFixed(2)}`,
      `$${(item.quantity * item.unitPrice).toFixed(2)}`
    ];
    tableRows.push(invoiceData);
  });

  doc.autoTable({
    startY: 80,
    head: [tableColumn],
    body: tableRows,
  });

  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.text(`Subtotal: $${(invoice.subtotal || invoice.total).toFixed(2)}`, 140, finalY);
  if (invoice.tax > 0) {
      doc.text(`GST (10%): $${invoice.tax.toFixed(2)}`, 140, finalY + 5);
      doc.setFontSize(12);
      doc.text(`Total: $${invoice.total.toFixed(2)}`, 140, finalY + 12);
  } else {
      doc.setFontSize(12);
      doc.text(`Total: $${invoice.total.toFixed(2)}`, 140, finalY + 7);
  }

  // Note
  doc.setFontSize(10);
  doc.text("Thank you for your business!", 14, finalY + 30);

  return doc;
};
