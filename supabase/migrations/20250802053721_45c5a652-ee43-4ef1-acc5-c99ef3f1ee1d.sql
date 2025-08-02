-- Stop the incorrectly timed cron job
SELECT cron.unschedule('daily_summary_v2_generation');