-- Debug query to check photo linking after fixes
-- Check target_images with their linked progress photos
SELECT 
  ti.id as target_image_id,
  ti.image_category,
  ti.ai_generated_from_photo_id,
  ti.created_at as target_created,
  wh.id as photo_id,
  wh.date as photo_date,
  wh.photo_urls
FROM target_images ti
LEFT JOIN weight_history wh ON ti.ai_generated_from_photo_id = wh.id
WHERE ti.created_at > now() - interval '24 hours'
ORDER BY ti.created_at DESC
LIMIT 10;