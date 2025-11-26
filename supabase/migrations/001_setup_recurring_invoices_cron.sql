-- Enable pg_cron extension (if not already enabled)
-- Note: This requires Supabase Pro plan or self-hosted Supabase
-- For free tier, use Vercel Cron instead (see vercel.json)

-- Uncomment the following if you have pg_cron enabled:
-- SELECT cron.schedule(
--   'process-recurring-invoices', -- Job name
--   '0 9 * * *', -- Run daily at 9 AM UTC (adjust timezone as needed)
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-recurring-invoices',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--       ),
--       body := '{}'::jsonb
--     ) AS request_id;
--   $$
-- );

-- Alternative: Create a function that can be called manually or via API
CREATE OR REPLACE FUNCTION process_recurring_invoices()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- This function can be called via Supabase Edge Function
  -- The actual processing logic is in the Edge Function
  -- This is just a placeholder for potential future SQL-based processing
  RETURN jsonb_build_object(
    'message', 'Use Supabase Edge Function /process-recurring-invoices instead'
  );
END;
$$;

