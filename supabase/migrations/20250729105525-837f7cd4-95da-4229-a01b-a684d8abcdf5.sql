-- Füge abgeschlossene Features hinzu, die bereits implementiert sind
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
-- Bereits implementierte Features (abgeschlossen)
('Quick-Input System für alle Tracking-Bereiche', 'Schnelle Eingabemöglichkeiten für Mahlzeiten, Workouts, Supplements, Gewicht und Flüssigkeiten implementiert', 'Core Features', 'completed', 'high', '2024-12-15', 100, '0.8', true),

('Workout-Bereich mit spezialisierten Coaches', 'Umfassende Workout-Tracking-Funktionen mit Markus, Sascha und weiteren spezialisierten Fitness-Coaches', 'Training & Coaching', 'completed', 'high', '2024-11-30', 100, '0.7', true),

('Direktes Workout-Tracking im Coaching-Screen', 'Integrierte Workout-Erfassung direkt während der Coach-Gespräche für nahtlose Trainingsplanung', 'Training & Coaching', 'completed', 'medium', '2024-12-20', 100, '0.8', true),

('Lucy Supplements-Tracking & Routine-Optimierung', 'Coach Lucy kann Supplements direkt erfassen und personalisierte Supplement-Routinen für optimierte Leistung erstellen', 'Coaching & AI', 'completed', 'medium', '2025-01-10', 100, '0.8', true),

('Detaillierte Analysen für Gewicht, Mahlzeiten & Workouts', 'Umfassende Analyse-Features mit Charts, Trends und KI-gestützten Insights für alle Tracking-Bereiche', 'Analytics & Insights', 'completed', 'high', '2024-12-01', 100, '0.7', true),

('Wissenschaftliche Coach-Wissensbasis (100+ Artikel)', 'Über 100 wissenschaftliche Artikel der letzten 10 Jahre zu Ernährung, Supplements und Workouts in die Coach-KI integriert', 'Science & Knowledge', 'completed', 'critical', '2025-01-15', 100, '0.8', true),

('Umfassende Mahlzeiten-Eingabe-Funktionen', 'Vollständiges Meal-Tracking mit Foto-Erkennung, Barcode-Scanner, Portionsgrößen und detaillierter Nährwertanalyse', 'Nutrition Tracking', 'completed', 'critical', '2024-10-30', 100, '0.6', true),

('Human Enhancement Protokolle', 'Biohacking und Human Enhancement Strategien für optimierte körperliche und geistige Leistung integriert', 'Advanced Features', 'completed', 'medium', '2024-12-10', 100, '0.7', true),

('KI-gestützte Mahlzeiten-Analyse mit Foto-Erkennung', 'Automatische Erkennung und Analyse von Mahlzeiten durch Foto-Upload mit präziser Nährwertberechnung', 'AI & Computer Vision', 'completed', 'high', '2024-11-15', 100, '0.7', true),

('Personalisierte Coach-Persönlichkeiten & Spezialisierungen', 'Verschiedene Coach-Charaktere mit spezifischen Expertenbereichen: Ernährung, Training, Supplements, Mental Health', 'Coaching & AI', 'completed', 'high', '2024-09-30', 100, '0.5', true),

('Integrierte Körpermessungen & Fortschritts-Tracking', 'Detaillierte Körpermessungen, Gewichtsverlauf und visuelle Fortschritts-Dokumentation mit Foto-Vergleichen', 'Progress Tracking', 'completed', 'medium', '2024-11-01', 100, '0.6', true),

('Gamification & Belohnungssystem', 'Punkte-System, Badges und Level-Progression zur Motivation und langfristigen Nutzerbindung', 'User Engagement', 'completed', 'medium', '2024-12-05', 100, '0.7', true);