-- Smoke-Test: Manueller Insert in daily_summaries
INSERT INTO daily_summaries (user_id, date, summary_struct_json, schema_version)
VALUES ('84b0664f-0934-49ce-9c35-c99546b792bf', '2025-08-01', '{}'::jsonb, '2025-08-v1');