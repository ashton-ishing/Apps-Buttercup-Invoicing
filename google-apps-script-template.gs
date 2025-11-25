/**
 * Apps Script for Butter Invoicing Automation
 * 
 * INSTRUCTIONS:
 * 1. Go to script.google.com and create a new project.
 * 2. Paste this code into Code.gs
 * 3. Create a Google Sheet to store invoices and note its ID.
 * 4. Create a Google Drive Folder to store PDFs and note its ID.
 * 5. Update the CONFIG object below with your IDs.
 * 6. Click "Deploy" > "New Deployment" > "Select type: Web app".
 * 7. Set "Execute as: Me" and "Who has access: Anyone".
 * 8. Copy the "Web App URL" and paste it into your Invoicing App Settings.
 */

const CONFIG = {
  // REPLACE THESE WITH YOUR ACTUAL IDs
  FOLDER_ID: 'YOUR_DRIVE_FOLDER_ID', 
  SHEET_ID: 'YOUR_SPREADSHEET_ID',
  SHEET_NAME: 'Invoices',
  // OPTIONAL: Set this if you want to send from an alias (must be verified in Gmail settings)
  EMAIL_ALIAS: 'billing@buttercup.digital' 
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { invoice, client, pdfBase64, emailBody } = data;

    // 1. Save PDF to Drive
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(pdfBase64), 'application/pdf', `${invoice.invoiceNumber}.pdf`);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();

    // 2. Log to Google Sheet
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
      sheet.appendRow(['Date', 'Invoice #', 'Client', 'Email', 'Amount', 'GST', 'Total', 'PDF Link', 'Status']);
    }
    
    sheet.appendRow([
      new Date(),
      invoice.invoiceNumber,
      client.name,
      client.email,
      invoice.subtotal || invoice.total,
      invoice.tax || 0,
      invoice.total,
      fileUrl,
      'Sent'
    ]);

    // 3. Send Email
    // Using GmailApp for advanced options like aliases
    const emailOptions = {
      attachments: [blob],
      name: 'Butter Invoicing'
    };

    // Add 'from' alias if configured
    if (CONFIG.EMAIL_ALIAS && CONFIG.EMAIL_ALIAS !== '') {
       emailOptions.from = CONFIG.EMAIL_ALIAS;
    }

    GmailApp.sendEmail(client.email, `Invoice ${invoice.invoiceNumber} from Butter`, emailBody, emailOptions);

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Invoice processed' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle CORS for browser fetch
function doGet(e) {
  return ContentService.createTextOutput("Active");
}

