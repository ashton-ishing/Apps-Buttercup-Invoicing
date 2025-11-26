# Recurring Invoices Automation Setup

This guide explains how to set up automatic processing of recurring invoices.

## Overview

The `process-recurring-invoices` Supabase Edge Function automatically:
- Finds recurring invoices due today (`nextRunDate <= today` and `status = 'Active'`)
- Creates invoices from them
- Updates `nextRunDate` based on frequency (Monthly, Quarterly, Yearly)
- Optionally sends emails via your Google Script webhook

## Setup Options

### Option 1: n8n Workflow Automation (Recommended - Best UI & Control)

n8n is a powerful workflow automation tool that's perfect for this use case. You can use the [cloud version](https://n8n.io) (free tier available) or self-host it.

1. **Deploy the Edge Function to Supabase:**
   ```bash
   cd supabase/functions/process-recurring-invoices
   supabase functions deploy process-recurring-invoices
   ```

2. **Set Environment Variable in Supabase:**
   - Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Add `SUPABASE_SERVICE_ROLE_KEY` (get this from Project Settings → API → service_role key)

3. **Create n8n Workflow:**
   - Sign up/login to n8n (cloud or self-hosted)
   - Create a new workflow
   - Add nodes in this order:
   
   **a) Schedule Trigger Node:**
   - Add "Schedule Trigger" node
   - Set to run daily at your preferred time (e.g., 9 AM)
   - Cron expression: `0 9 * * *` (9 AM daily)
   
   **b) HTTP Request Node:**
   - Add "HTTP Request" node
   - **Method:** POST
   - **URL:** `https://ykeleczkajugieljjxlb.supabase.co/functions/v1/process-recurring-invoices`
   - **Authentication:** None (we'll add headers manually)
   - **Headers:**
     - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type`: `application/json`
   - **Body:** `{}`
   
   **c) (Optional) Error Handling:**
   - Add "IF" node to check for errors
   - Add "Send Email" or "Slack" node to notify on errors
   
   **d) (Optional) Logging:**
   - Add "Set" node to log results
   - Connect to a database or webhook for tracking

4. **Activate the Workflow:**
   - Click "Active" toggle in n8n
   - The workflow will now run automatically on schedule

**Quick Setup (Import Template):**
- You can import the workflow template from `n8n-workflow-template.json`
- In n8n: Workflows → Import from File → Select the JSON file
- Update the `YOUR_SERVICE_ROLE_KEY` in the HTTP Request node
- Activate the workflow

**Benefits of n8n:**
- ✅ Visual workflow builder
- ✅ Easy error handling and retries
- ✅ Can add notifications (email, Slack, etc.)
- ✅ Execution history and logs
- ✅ Can trigger manually for testing
- ✅ Free tier available (cloud) or self-hosted

### Option 2: External Cron Service (Simple Alternative)

Use a free service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. **Deploy the Edge Function to Supabase:**
   ```bash
   cd supabase/functions/process-recurring-invoices
   supabase functions deploy process-recurring-invoices
   ```

2. **Set Environment Variable in Supabase:**
   - Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Add `SUPABASE_SERVICE_ROLE_KEY` (get this from Project Settings → API → service_role key)

3. **Create Cron Job:**
   - Sign up for a free cron service
   - Create a new cron job with:
     - **URL:** `https://ykeleczkajugieljjxlb.supabase.co/functions/v1/process-recurring-invoices`
     - **Method:** POST
     - **Headers:** 
       - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
       - `Content-Type: application/json`
     - **Body:** `{}`
     - **Schedule:** Daily at 9 AM UTC (or your preferred time)

### Option 3: Supabase pg_cron (Requires Pro Plan)

1. **Enable pg_cron extension:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Schedule the job:**
   ```sql
   SELECT cron.schedule(
     'process-recurring-invoices',
     '0 9 * * *', -- Daily at 9 AM UTC
     $$
     SELECT
       net.http_post(
         url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-recurring-invoices',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
         ),
         body := '{}'::jsonb
       ) AS request_id;
     $$
   );
   ```

### Option 4: External Cron Service (Simple Alternative)

Use a free service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. **Create a cron job** that calls:
   ```
   POST https://ykeleczkajugieljjxlb.supabase.co/functions/v1/process-recurring-invoices
   Headers:
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
   Body: {}
   ```

2. **Schedule it** to run daily (e.g., 9 AM UTC)

## Manual Testing

You can manually trigger the function:

```bash
curl -X POST \
  'https://ykeleczkajugieljjxlb.supabase.co/functions/v1/process-recurring-invoices' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## How It Works

1. **Daily Check:** The cron job runs daily at 9 AM UTC
2. **Find Due Invoices:** Queries for recurring invoices where:
   - `status = 'Active'`
   - `nextRunDate <= today`
3. **Create Invoices:** For each due recurring invoice:
   - Creates a new invoice with status 'Sent'
   - Generates invoice number (INV-YYYYMMDD-XXXX)
   - Sets issue date to today
   - Calculates due date based on payment terms
4. **Update Schedule:** Updates `nextRunDate`:
   - Monthly: +1 month
   - Quarterly: +3 months
   - Yearly: +1 year
5. **Send Emails:** If Google Script URL is configured, sends email automatically

## Monitoring

Check the Edge Function logs in Supabase Dashboard → Edge Functions → process-recurring-invoices → Logs

The function returns:
```json
{
  "success": true,
  "processed": 2,
  "invoices": [
    {
      "invoiceNumber": "INV-20241126-1234",
      "clientName": "Client Name",
      "amount": 300
    }
  ],
  "errors": [] // Any errors encountered
}
```

## Troubleshooting

- **No invoices created:** Check that recurring invoices have `nextRunDate` set and `status = 'Active'`
- **Email not sending:** Verify `google_script_url` is set in `user_settings` table
- **Function errors:** Check Supabase Edge Function logs for detailed error messages

