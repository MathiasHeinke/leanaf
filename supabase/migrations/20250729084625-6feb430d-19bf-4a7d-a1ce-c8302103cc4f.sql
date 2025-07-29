-- Insert 6 email templates for automation
INSERT INTO public.email_templates (name, subject, template_type, html_content, text_content, is_active) VALUES 

-- Welcome Email
('Willkommen bei GetleanAI', 'Willkommen bei GetleanAI - Lass uns starten! 🚀', 'welcome', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 10px 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Willkommen bei GetleanAI! 🎉</h1>
            <p>Hallo {{user_name}}, schön dass du da bist!</p>
        </div>
        <div class="content">
            <h2>Deine Fitness-Reise beginnt jetzt</h2>
            <p>Du hast den ersten wichtigen Schritt gemacht! GetleanAI wird dein persönlicher KI-Coach sein und dir dabei helfen, deine Fitness- und Ernährungsziele zu erreichen.</p>
            
            <h3>Das erwartet dich:</h3>
            <ul>
                <li>📱 Persönliche KI-Coaches für Training und Ernährung</li>
                <li>📊 Intelligente Mahlzeit-Analyse mit der Kamera</li>
                <li>🏋️‍♂️ Maßgeschneiderte Trainingspläne</li>
                <li>📈 Detaillierte Fortschritts-Tracking</li>
            </ul>
            
            <p>Lass uns gleich mit deiner ersten Mahlzeit starten!</p>
            <a href="{{app_url}}" class="button">Erste Mahlzeit tracken 📸</a>
            
            <p><strong>Tipp:</strong> Mache ein Foto deiner nächsten Mahlzeit - unser KI-Coach analysiert die Nährwerte automatisch!</p>
        </div>
        <div class="footer">
            <p>GetleanAI - Dein intelligenter Fitness-Coach</p>
            <p>Fragen? Antworte einfach auf diese E-Mail!</p>
        </div>
    </div>
</body>
</html>',
'Willkommen bei GetleanAI!

Hallo {{user_name}}, schön dass du da bist!

Deine Fitness-Reise beginnt jetzt. GetleanAI wird dein persönlicher KI-Coach sein und dir dabei helfen, deine Fitness- und Ernährungsziele zu erreichen.

Das erwartet dich:
- Persönliche KI-Coaches für Training und Ernährung
- Intelligente Mahlzeit-Analyse mit der Kamera
- Maßgeschneiderte Trainingspläne
- Detaillierte Fortschritts-Tracking

Lass uns gleich mit deiner ersten Mahlzeit starten: {{app_url}}

Tipp: Mache ein Foto deiner nächsten Mahlzeit - unser KI-Coach analysiert die Nährwerte automatisch!

GetleanAI - Dein intelligenter Fitness-Coach
Fragen? Antworte einfach auf diese E-Mail!', true),

-- Day 3: First Steps
('Tag 3: Deine ersten Schritte', 'Wie läuft es, {{user_name}}? Deine ersten Erfolge! 💪', 'onboarding_sequence',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; }
        .button { display: inline-block; background: #2f80ed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .tip-box { background: #e3f2fd; padding: 20px; border-left: 4px solid #2196f3; margin: 20px 0; border-radius: 0 6px 6px 0; }
        .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 10px 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Tag 3 - Du machst das großartig! 🌟</h1>
            <p>Hallo {{user_name}}!</p>
        </div>
        <div class="content">
            <h2>Deine ersten Schritte sind geschafft</h2>
            <p>Es sind schon 3 Tage vergangen seit deiner Anmeldung. Wie läuft es mit GetleanAI?</p>
            
            <div class="tip-box">
                <h3>💡 Pro-Tipp für heute:</h3>
                <p><strong>Nutze die Foto-Funktion!</strong> Mache Fotos von deinen Mahlzeiten - unser KI-Coach lernt deine Gewohnheiten kennen und gibt dir personalisierte Tipps.</p>
            </div>
            
            <h3>Das solltest du als nächstes machen:</h3>
            <ul>
                <li>🍽️ Tracke mindestens 3 Mahlzeiten mit Fotos</li>
                <li>⚖️ Trage dein aktuelles Gewicht ein</li>
                <li>🎯 Definiere deine Ziele im Profil</li>
                <li>💬 Stelle deinem KI-Coach eine Frage</li>
            </ul>
            
            <a href="{{app_url}}" class="button">Weiter tracken 📈</a>
            
            <p><strong>Erinnerung:</strong> Jede kleine Gewohnheit zählt. Du bist auf dem richtigen Weg!</p>
        </div>
        <div class="footer">
            <p>GetleanAI - Dein intelligenter Fitness-Coach</p>
            <p>Du hast Fragen? Unser Support hilft gerne!</p>
        </div>
    </div>
</body>
</html>',
'Tag 3 - Du machst das großartig!

Hallo {{user_name}}!

Es sind schon 3 Tage vergangen seit deiner Anmeldung. Wie läuft es mit GetleanAI?

Pro-Tipp für heute:
Nutze die Foto-Funktion! Mache Fotos von deinen Mahlzeiten - unser KI-Coach lernt deine Gewohnheiten kennen und gibt dir personalisierte Tipps.

Das solltest du als nächstes machen:
- Tracke mindestens 3 Mahlzeiten mit Fotos
- Trage dein aktuelles Gewicht ein
- Definiere deine Ziele im Profil
- Stelle deinem KI-Coach eine Frage

Weiter tracken: {{app_url}}

Erinnerung: Jede kleine Gewohnheit zählt. Du bist auf dem richtigen Weg!

GetleanAI - Dein intelligenter Fitness-Coach', true),

-- Week 1: Progress
('Woche 1: Dein Fortschritt', 'Eine Woche mit GetleanAI - Deine Erfolge! 🎉', 'onboarding_sequence',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; }
        .button { display: inline-block; background: #00bcd4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .stats-box { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 10px 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏆 Eine Woche geschafft!</h1>
            <p>Stolz auf dich, {{user_name}}!</p>
        </div>
        <div class="content">
            <h2>Deine erste Woche mit GetleanAI</h2>
            <p>Eine ganze Woche ist vergangen - und du bist dabei geblieben! Das ist schon ein großer Erfolg.</p>
            
            <div class="stats-box">
                <h3>📊 Deine Erfolge bisher:</h3>
                <p><strong>Du hast den ersten wichtigen Schritt gemacht:</strong><br>
                Eine gesunde Routine zu entwickeln!</p>
            </div>
            
            <h3>🚀 Steigere jetzt deine Erfolge:</h3>
            <ul>
                <li>🏋️‍♂️ Starte mit unserem Training-Coach</li>
                <li>📸 Nutze die Foto-Analyse für noch bessere Ergebnisse</li>
                <li>⭐ Sammle Punkte und erreiche neue Level</li>
                <li>📱 Aktiviere Benachrichtigungen für tägliche Motivation</li>
            </ul>
            
            <a href="{{app_url}}" class="button">Neue Ziele setzen 🎯</a>
            
            <p><strong>Du machst das großartig!</strong> Die ersten 7 Tage sind oft die schwersten - und du hast sie gemeistert.</p>
        </div>
        <div class="footer">
            <p>GetleanAI - Dein intelligenter Fitness-Coach</p>
            <p>Teile deine Erfolge mit uns - wir freuen uns!</p>
        </div>
    </div>
</body>
</html>',
'Eine Woche geschafft!

Stolz auf dich, {{user_name}}!

Eine ganze Woche ist vergangen - und du bist dabei geblieben! Das ist schon ein großer Erfolg.

Deine Erfolge bisher:
Du hast den ersten wichtigen Schritt gemacht: Eine gesunde Routine zu entwickeln!

Steigere jetzt deine Erfolge:
- Starte mit unserem Training-Coach
- Nutze die Foto-Analyse für noch bessere Ergebnisse
- Sammle Punkte und erreiche neue Level
- Aktiviere Benachrichtigungen für tägliche Motivation

Neue Ziele setzen: {{app_url}}

Du machst das großartig! Die ersten 7 Tage sind oft die schwersten - und du hast sie gemeistert.

GetleanAI - Dein intelligenter Fitness-Coach', true),

-- 3 Days Inactive
('Wir vermissen dich!', 'Hey {{user_name}}, alles okay? 😊', 'activity_encouragement',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%); color: #2d3436; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; }
        .button { display: inline-block; background: #e17055; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .gentle-box { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 10px 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Hey {{user_name}}! 👋</h1>
            <p>Wir haben dich ein paar Tage nicht gesehen</p>
        </div>
        <div class="content">
            <h2>Alles in Ordnung?</h2>
            <p>Es ist schon ein paar Tage her, seit du das letzte Mal bei GetleanAI warst. Keine Sorge - das passiert uns allen!</p>
            
            <div class="gentle-box">
                <h3>💚 Kein Stress!</h3>
                <p>Gesunde Gewohnheiten brauchen Zeit. Es ist völlig normal, dass man mal eine Pause macht. Das Wichtigste ist, wieder anzufangen.</p>
            </div>
            
            <h3>🌟 Kleine Schritte zählen:</h3>
            <ul>
                <li>📸 Ein einziges Foto einer Mahlzeit reicht schon</li>
                <li>⚖️ Kurz das Gewicht checken</li>
                <li>💬 Eine schnelle Frage an den Coach</li>
                <li>🚶‍♂️ Auch kleine Aktivitäten zählen</li>
            </ul>
            
            <a href="{{app_url}}" class="button">Sanft wieder einsteigen 🌱</a>
            
            <p><strong>Du hast es schon einmal geschafft</strong> - und du schaffst es wieder! Wir sind für dich da.</p>
        </div>
        <div class="footer">
            <p>GetleanAI - Immer für dich da</p>
            <p>Brauchst du Hilfe? Schreib uns einfach!</p>
        </div>
    </div>
</body>
</html>',
'Hey {{user_name}}!

Wir haben dich ein paar Tage nicht gesehen. Alles in Ordnung?

Es ist schon ein paar Tage her, seit du das letzte Mal bei GetleanAI warst. Keine Sorge - das passiert uns allen!

Kein Stress!
Gesunde Gewohnheiten brauchen Zeit. Es ist völlig normal, dass man mal eine Pause macht. Das Wichtigste ist, wieder anzufangen.

Kleine Schritte zählen:
- Ein einziges Foto einer Mahlzeit reicht schon
- Kurz das Gewicht checken
- Eine schnelle Frage an den Coach
- Auch kleine Aktivitäten zählen

Sanft wieder einsteigen: {{app_url}}

Du hast es schon einmal geschafft - und du schaffst es wieder! Wir sind für dich da.

GetleanAI - Immer für dich da', true),

-- 1 Week Inactive
('Deine Ziele warten auf dich!', 'Zeit für ein Comeback, {{user_name}}! 💪', 'activity_encouragement',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; }
        .button { display: inline-block; background: #e84393; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .motivation-box { background: #ffe8e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b6b; }
        .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 10px 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Zeit für dein Comeback! 🔥</h1>
            <p>{{user_name}}, deine Ziele warten auf dich!</p>
        </div>
        <div class="content">
            <h2>Eine Woche Pause - jetzt geht''s weiter!</h2>
            <p>Eine Woche ist vergangen, und wir vermissen dich bei GetleanAI! Deine Gesundheitsziele haben nicht aufgegeben - und wir auch nicht.</p>
            
            <div class="motivation-box">
                <h3>🚀 Warum jetzt der perfekte Moment ist:</h3>
                <p><strong>Jeder Tag ist ein neuer Anfang!</strong> Die beste Zeit zu starten ist nicht morgen oder nächste Woche - sondern jetzt, in diesem Moment.</p>
            </div>
            
            <h3>🎯 Starte smart durch:</h3>
            <ul>
                <li>🍎 Beginne mit einer gesunden Mahlzeit heute</li>
                <li>📊 Überprüfe deine bisherigen Erfolge</li>
                <li>🏃‍♂️ Setze dir ein kleines Ziel für diese Woche</li>
                <li>💡 Lass dich vom KI-Coach motivieren</li>
            </ul>
            
            <a href="{{app_url}}" class="button">Jetzt durchstarten! 🚀</a>
            
            <p><strong>Remember:</strong> Du bist stärker als du denkst. Jeder Experte war mal ein Anfänger, der nicht aufgegeben hat!</p>
        </div>
        <div class="footer">
            <p>GetleanAI - Dein Comeback-Partner</p>
            <p>Motivation gefällig? Unser Coach wartet auf dich!</p>
        </div>
    </div>
</body>
</html>',
'Zeit für dein Comeback!

{{user_name}}, deine Ziele warten auf dich!

Eine Woche ist vergangen, und wir vermissen dich bei GetleanAI! Deine Gesundheitsziele haben nicht aufgegeben - und wir auch nicht.

Warum jetzt der perfekte Moment ist:
Jeder Tag ist ein neuer Anfang! Die beste Zeit zu starten ist nicht morgen oder nächste Woche - sondern jetzt, in diesem Moment.

Starte smart durch:
- Beginne mit einer gesunden Mahlzeit heute
- Überprüfe deine bisherigen Erfolge
- Setze dir ein kleines Ziel für diese Woche
- Lass dich vom KI-Coach motivieren

Jetzt durchstarten: {{app_url}}

Remember: Du bist stärker als du denkst. Jeder Experte war mal ein Anfänger, der nicht aufgegeben hat!

GetleanAI - Dein Comeback-Partner', true),

-- 2 Weeks Inactive
('Letzte Chance: Comeback-Angebot!', 'Wir wollen dich zurück, {{user_name}}! 🎁', 'activity_encouragement',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; }
        .button { display: inline-block; background: #6c5ce7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .offer-box { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #74b9ff; text-align: center; }
        .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 10px 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎁 Spezielles Comeback-Angebot!</h1>
            <p>{{user_name}}, wir vermissen dich sehr!</p>
        </div>
        <div class="content">
            <h2>2 Wochen ohne dich - das ist zu lang!</h2>
            <p>Wir wissen, dass das Leben manchmal hektisch wird. Aber deine Gesundheit und deine Ziele sind es wert, dass du zurückkommst!</p>
            
            <div class="offer-box">
                <h3>🌟 Dein Comeback-Geschenk:</h3>
                <p><strong>7 Tage Premium-Features kostenlos!</strong><br>
                Erweiterte KI-Analyse, persönliche Trainingspläne und exklusive Coach-Gespräche.</p>
                <p><em>Nur für zurückkehrende Nutzer wie dich!</em></p>
            </div>
            
            <h3>💪 Was auf dich wartet:</h3>
            <ul>
                <li>🤖 Noch smartere KI-Coaches</li>
                <li>📈 Verbesserte Fortschritts-Analyse</li>
                <li>🍽️ Neue Rezept-Vorschläge</li>
                <li>🏆 Frische Challenges und Belohnungen</li>
            </ul>
            
            <a href="{{app_url}}" class="button">Comeback-Angebot aktivieren! 🎉</a>
            
            <p><strong>Wichtig:</strong> Dieses Angebot ist nur begrenzt verfügbar. Deine Ziele warten nicht - und wir warten auf dich!</p>
            
            <p><em>Falls du GetleanAI nicht mehr nutzen möchtest, klicke <a href="#">hier zum Abmelden</a>.</em></p>
        </div>
        <div class="footer">
            <p>GetleanAI - Bereit für dein Comeback</p>
            <p>Fragen? Unser Support ist für dich da!</p>
        </div>
    </div>
</body>
</html>',
'Spezielles Comeback-Angebot!

{{user_name}}, wir vermissen dich sehr!

2 Wochen ohne dich - das ist zu lang! Wir wissen, dass das Leben manchmal hektisch wird. Aber deine Gesundheit und deine Ziele sind es wert, dass du zurückkommst!

Dein Comeback-Geschenk:
7 Tage Premium-Features kostenlos! Erweiterte KI-Analyse, persönliche Trainingspläne und exklusive Coach-Gespräche.
Nur für zurückkehrende Nutzer wie dich!

Was auf dich wartet:
- Noch smartere KI-Coaches
- Verbesserte Fortschritts-Analyse
- Neue Rezept-Vorschläge
- Frische Challenges und Belohnungen

Comeback-Angebot aktivieren: {{app_url}}

Wichtig: Dieses Angebot ist nur begrenzt verfügbar. Deine Ziele warten nicht - und wir warten auf dich!

Falls du GetleanAI nicht mehr nutzen möchtest, kannst du dich abmelden.

GetleanAI - Bereit für dein Comeback', true);