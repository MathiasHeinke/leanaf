-- Create admin notes table for coach conversation monitoring
CREATE TABLE public.admin_conversation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id) NOT NULL,
  note TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('gelesen', 'verstanden', 'abgelegt')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_conversation_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for admin conversation notes
CREATE POLICY "Super admins can manage admin conversation notes"
ON public.admin_conversation_notes
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create policy for admins to view and manage notes
CREATE POLICY "Admins can manage conversation notes"
ON public.admin_conversation_notes
FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_admin_conversation_notes_conversation_id ON public.admin_conversation_notes(conversation_id);
CREATE INDEX idx_admin_conversation_notes_admin_user_id ON public.admin_conversation_notes(admin_user_id);
CREATE INDEX idx_admin_conversation_notes_status ON public.admin_conversation_notes(status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_admin_conversation_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_conversation_notes_updated_at
BEFORE UPDATE ON public.admin_conversation_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_conversation_notes_updated_at();