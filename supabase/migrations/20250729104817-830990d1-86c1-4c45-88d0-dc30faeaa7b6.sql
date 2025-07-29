-- Erstelle Roadmap-Items für KaloTracker
-- Lösche bestehende Items zuerst (falls vorhanden)
DELETE FROM public.roadmap_items WHERE title IN (
  'UX-/UI-Feinschliff & Bug-Fixes',
  '50 Beta-Tester erhalten 1 Jahr „Pro" gratis',
  'Apple-Login Integration',
  'Stable-Version veröffentlichen',
  'App-Store-Listing finalisieren',
  'Tagebuch-/Reflexions-Quick-Input',
  'Schritt- & Kilometer-Tracking',
  'Anbindung smarter Waagen',
  'Zusätzliche Coach-Charaktere',
  'Feature-Voting-System',
  'Passwort-Stärke-Check',
  'Security-Fixes & Pen-Tests',
  'Großflächige Marketing-Kampagne'
);

-- Füge neue Roadmap-Items ein
INSERT INTO public.roadmap_items (
  title, 
  description, 
  category, 
  status, 
  priority, 
  estimated_completion, 
  completion_percentage, 
  version, 
  is_public
) VALUES 
-- Beta-Phase (JETZT → KW 32)
('UX-/UI-Feinschliff & Bug-Fixes', 'Optimierung der Benutzeroberfläche und Behebung von Fehlern für eine bessere Nutzererfahrung', 'Beta-Phase', 'in_progress', 'high', '2025-08-10', 70, '0.9', true),
('50 Beta-Tester erhalten 1 Jahr „Pro" gratis', 'Auswahl und Aktivierung von 50 Beta-Testern mit kostenlosen Pro-Accounts', 'Beta-Phase', 'in_progress', 'medium', '2025-08-10', 60, '0.9', true),
('Apple-Login Integration', 'Integration von Apple Sign-In für iOS-Nutzer', 'Beta-Phase', 'in_progress', 'high', '2025-08-10', 40, '0.9', true),

-- Public Launch (KW 34 / Mitte August 2025)
('Stable-Version veröffentlichen', 'Finale Stable-Version der App mit aktivem Subscription-Flow', 'Public Launch', 'planned', 'critical', '2025-08-25', 0, '1.0', true),
('App-Store-Listing finalisieren', 'Fertigstellung der App-Store-Präsenz und Release-Notes', 'Public Launch', 'planned', 'high', '2025-08-25', 0, '1.0', true),

-- Post-Launch Enhancements (ab KW 36)
('Tagebuch-/Reflexions-Quick-Input', 'Schnelle Eingabemöglichkeit für Tagebuch- und Reflexionseinträge', 'Post-Launch Enhancements', 'planned', 'medium', '2025-09-08', 0, '1.1', true),
('Schritt- & Kilometer-Tracking', 'Integration von Apple Health und Google Fit für Aktivitätstracking', 'Post-Launch Enhancements', 'planned', 'medium', '2025-09-15', 0, '1.1', true),
('Anbindung smarter Waagen', 'Integration von Withings und anderen Smart-Scale-Herstellern', 'Post-Launch Enhancements', 'planned', 'medium', '2025-09-22', 0, '1.2', true),

-- KI- & Community-Features (Q4 2025)
('Zusätzliche Coach-Charaktere', 'Erweiterung um weitere KI-Coaches für verschiedene Themenbereiche', 'KI- & Community-Features', 'planned', 'medium', '2025-10-31', 0, '1.3', true),
('Feature-Voting-System', 'Community-basiertes Voting-System für neue Features mit Polls und Rankings', 'KI- & Community-Features', 'planned', 'low', '2025-11-30', 0, '1.3', true),

-- Security & Compliance (laufend)
('Passwort-Stärke-Check', 'Implementierung von Passwort-Validierung und Sicherheitswarnungen', 'Security & Compliance', 'in_progress', 'high', '2025-08-31', 80, '1.0', true),
('Security-Fixes & Pen-Tests', 'Kontinuierliche Sicherheitsverbesserungen und Penetrationstests', 'Security & Compliance', 'planned', 'critical', '2025-12-31', 0, null, true),

-- Marketing-Roll-out (ab September 2025)
('Großflächige Marketing-Kampagne', 'Launch von Influencer-Marketing, Paid Social Media und PR-Kampagnen', 'Marketing-Roll-out', 'planned', 'high', '2025-09-30', 0, '1.0', true);