-- Bucket für temporäre Laborbericht-Uploads (OCR)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bloodwork-uploads', 'bloodwork-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Nur authentifizierte User können eigene Uploads erstellen
CREATE POLICY "Users can upload bloodwork files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bloodwork-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Nur eigene Dateien sehen
CREATE POLICY "Users can view own bloodwork files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bloodwork-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Nur eigene Dateien löschen
CREATE POLICY "Users can delete own bloodwork files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bloodwork-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);