
# Natürlicher Gesprächsfluss: Keine Begrüßungen bei laufender Konversation

## Das Problem

ARES beginnt JEDE Antwort mit einer Begrüßung wie "Guten Morgen, Mathias!" - selbst wenn ihr schon seit mehreren Nachrichten miteinander chattet. Das wirkt:
- Unnatürlich und roboterhaft
- Als ob jede Antwort eine neue Session wäre
- Nervig bei intensiven Gesprächen

## Die Lösung: "Conversation Flow" Regel

Im `intelligentPromptBuilder.ts` fügen wir eine dynamische Regel hinzu, die:
1. Bei `conversationHistory.length > 0` erkennt, dass es ein laufendes Gespräch ist
2. Eine explizite "KEINE BEGRÜSSUNG"-Anweisung injiziert
3. Je nach Konversationslänge den Ton anpasst (längeres Gespräch = vertrauter)

## Technische Umsetzung

### Neue Sektion im Prompt Builder

Nach der `== KRITISCH: STIL-ANWEISUNG ==` Sektion (Zeile 222-236) fügen wir hinzu:

```typescript
// ═══════════════════════════════════════════════════════════════════════════════
// ABSCHNITT 5B: GESPRÄCHSFLUSS - Keine Begrüßung bei laufender Session
// ═══════════════════════════════════════════════════════════════════════════════
if (conversationHistory.length > 0) {
  sections.push('');
  sections.push('== KRITISCH: GESPRAECHSFLUSS ==');
  sections.push('Dies ist KEINE neue Session - ihr seid bereits im Gespraech!');
  sections.push('');
  sections.push('VERBOTEN am Antwort-Anfang:');
  sections.push('- Begruessungen: "Guten Morgen", "Hey", "Hallo", "Moin", "Hi"');
  sections.push('- Anreden mit Name: "Also Mathias...", "Okay Mathias..."');
  sections.push('- Session-Opener: "Schoen dass du fragst", "Gute Frage"');
  sections.push('- Energie-Intros: "Schnall dich an", "Los gehts", "Lass uns..."');
  sections.push('');
  sections.push('STATTDESSEN - Starte direkt mit dem Inhalt:');
  sections.push('- Bei Fragen: Direkt die Antwort ("Die Frage nach dem Timing...")');
  sections.push('- Bei Statements: Direkte Reaktion ("Genau so!", "Das stimmt...")');
  sections.push('- Bei Follow-ups: Natuerliche Fortsetzung ("Und zusaetzlich...")');
  
  // Dynamische Vertrautheit basierend auf Konversationslänge
  const msgCount = conversationHistory.length;
  if (msgCount >= 6) {
    sections.push('');
    sections.push('KONVERSATIONS-TIEFE: Intensives Gespraech (6+ Nachrichten)');
    sections.push('Ihr seid mitten in einer Diskussion - sprich wie ein Freund der seit 10 Minuten mit dir redet.');
    sections.push('Kurze, praegnante Antworten sind OK. Kein formelles Aufplustern.');
  } else if (msgCount >= 2) {
    sections.push('');
    sections.push('KONVERSATIONS-TIEFE: Laufendes Gespraech (2-5 Nachrichten)');
    sections.push('Ihr habt gerade angefangen - natuerlicher Flow, aber noch nicht ultra-kurz.');
  }
}
```

### Positionierung im Code

Die neue Sektion kommt direkt nach der Stil-Anweisung (Zeile 236), bevor der Mood-Detection Abschnitt beginnt. So ist die Reihenfolge:
1. Konversationshistorie (Inhalt)
2. Stil-Anweisung (kein Dialekt kopieren)
3. **NEU: Gesprächsfluss (keine Begrüßung)**
4. Mood Detection

## Erwartetes Ergebnis

### Vorher (aktuell):
```
User: "ab wann am besten die ersten carbs?"

ARES: "Guten Morgen, Mathias! Schnall dich an, wir gehen tief 
in die Chronobiologie der Insulin-Sensitivität! 🧬⚡

Die Frage nach dem Timing der ersten Kohlenhydrate..."
```

### Nachher (mit Fix):
```
User: "ab wann am besten die ersten carbs?"

ARES: "Die Frage nach dem Timing der ersten Kohlenhydrate ist 
kein bloßes 'Wann habe ich Hunger?', sondern eine strategische 
Entscheidung über dein hormonelles Milieu. 🧬

Der biochemische Kontext..."
```

## Betroffene Datei

| Datei | Aktion | Änderung |
|-------|--------|----------|
| `supabase/functions/_shared/context/intelligentPromptBuilder.ts` | **EDIT** | Neue "GESPRÄCHSFLUSS" Sektion nach Zeile 236 |

## Implementierungsdetails

Die Änderung erfolgt in der `buildIntelligentSystemPrompt()` Funktion:
- Nach der bestehenden Stil-Anweisung (Zeile 222-236)
- Vor dem Mood-Detection Abschnitt (Zeile 239)
- Nutzt die bereits vorhandene `conversationHistory.length` Prüfung
- Keine neuen Abhängigkeiten nötig
