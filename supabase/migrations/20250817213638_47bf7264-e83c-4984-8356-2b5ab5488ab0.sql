
-- 1) Create/Upsert a new public bucket restricted to WebP images
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('nutrition-images', 'nutrition-images', true, array['image/webp'])
on conflict (id) do update
set public = excluded.public,
    allowed_mime_types = excluded.allowed_mime_types;

-- 2) RLS policies for this bucket's objects

-- Public read access (so the app can load images via public URLs)
create policy "Public read for nutrition-images"
on storage.objects
for select
using (bucket_id = 'nutrition-images');

-- Authenticated users can upload only into their own folder: {userId}/...
create policy "Authenticated upload to own folder (nutrition-images)"
on storage.objects
for insert
with check (
  bucket_id = 'nutrition-images'
  and auth.role() = 'authenticated'
  and (name like auth.uid()::text || '/%')
);

-- Owners can update their own objects
create policy "Owner update (nutrition-images)"
on storage.objects
for update
using (
  bucket_id = 'nutrition-images'
  and owner = auth.uid()
)
with check (
  bucket_id = 'nutrition-images'
  and owner = auth.uid()
);

-- Owners can delete their own objects
create policy "Owner delete (nutrition-images)"
on storage.objects
for delete
using (
  bucket_id = 'nutrition-images'
  and owner = auth.uid()
);
