// Voice Lines + Deep Follow-up System
export type Archetype = "Kommandant" | "Schmied" | "Vater" | "Weiser" | "Kamerad" | "Hearthkeeper";

export type VoiceTopic = "plan" | "checkin" | "struggle" | "default" | "success" | "motivation";

export function pickVoiceLine(archetype: Archetype, topic: VoiceTopic = "default"): string {
  const voicePool = {
    Kommandant: {
      plan: ["Befehl klar. Jetzt handeln.", "Keine Ausreden. Nur Ergebnisse.", "Fokus. Los geht's."],
      checkin: ["Status Report. Wie stehen wir?", "Fortschritt melden.", "Zahlen auf den Tisch."],
      struggle: ["Rückzug ist keine Option.", "Kämpf weiter. Das ist ein Befehl.", "Steh auf. Weiter."],
      success: ["Gut gemacht, Soldat.", "Mission erfüllt.", "Weiter so."],
      default: ["Fokus. Handy weg.", "Disziplin entscheidet.", "Ausführen."]
    },
    Schmied: {
      plan: ["Kleiner Schlag. Großer Stahl.", "Tracken = Schmieden. Jeden Tag.", "Hammer hoch."],
      checkin: ["Wie läuft die Schmiede?", "Eisen noch heiß?", "Zeig mir das Werk."],
      struggle: ["Stahl wird im Feuer geboren.", "Jeder Schlag zählt.", "Weiter hämmern."],
      success: ["Meisterwerk im Entstehen.", "Gute Arbeit am Amboss.", "Der Stahl wird stark."],
      default: ["1% heute. Weiter.", "Hämmern bis es stimmt.", "Feuer bleibt an."]
    },
    Vater: {
      plan: ["Ich bin hier. Atme.", "Zwei Schritte reichen heute.", "Langsam und sicher."],
      checkin: ["Wie geht es dir wirklich?", "Erzähl mal.", "Ich höre zu."],
      struggle: ["Du schaffst das. Ich glaube an dich.", "Einer nach dem anderen.", "Pause ist okay."],
      success: ["Ich bin stolz auf dich.", "Siehst du? Du kannst das.", "Weiter so, mein Kind."],
      default: ["Leise stark. Weiter so.", "Du bist nicht allein.", "Schritt für Schritt."]
    },
    Weiser: {
      plan: ["Erst Licht, dann urteilen.", "Daten vor Drama.", "Klarheit bringt Fortschritt."],
      checkin: ["Was sagen die Zahlen?", "Betrachten wir das genauer.", "Lass uns analysieren."],
      struggle: ["Jede Erfahrung lehrt.", "Rückschläge sind Daten.", "Was lernst du daraus?"],
      success: ["Ergebnis der Beständigkeit.", "Wissen wird Weisheit.", "Gut durchdacht."],
      default: ["Konsistenz schlägt Intensität.", "Beobachten. Verstehen. Handeln.", "Geduld zahlt sich aus."]
    },
    Kamerad: {
      plan: ["Ich bin neben dir.", "Gemeinsam schaffen wir das.", "Zusammen stark."],
      checkin: ["Wie läuft's, Kumpel?", "Alles klar bei dir?", "Update von der Front?"],
      struggle: ["Wir ziehen das durch.", "Ich lass dich nicht fallen.", "Team bleibt zusammen."],
      success: ["Das haben WIR geschafft!", "High Five!", "Auf uns!"],
      default: ["Kein Drama. Wir gehen.", "Helm auf. Los.", "Seite an Seite."]
    },
    Hearthkeeper: {
      plan: ["Feuer runter, Haus sichern.", "Ruhe bewahren.", "Alles zu seiner Zeit."],
      checkin: ["Bist du zu Hause angekommen?", "Wie fühlst du dich?", "Brauchst du Ruhe?"],
      struggle: ["Das Haus steht fest.", "Du bist sicher hier.", "Atme tief durch."],
      success: ["Das Feuer brennt warm.", "Heim gefunden.", "Gut gemacht."],
      default: ["Morgen schmieden wir weiter.", "Du bist zu Hause.", "Sicher und warm."]
    }
  } as const;

  const lines = voicePool[archetype]?.[topic] || voicePool[archetype]?.default || ["Weiter so."];
  return lines[Math.floor(Math.random() * lines.length)];
}

export function wantDeepFollowUp(context: { 
  relapse?: boolean; 
  newMission?: boolean; 
  askedWhy?: boolean;
  isComplexQuery?: boolean;
}): boolean {
  return !!(
    context.relapse || 
    context.newMission || 
    context.askedWhy ||
    context.isComplexQuery
  );
}

export function detectTopic(userMsg: string): VoiceTopic {
  if (/(plan|ziel|strategy|strategie)/i.test(userMsg)) return "plan";
  if (/(check|status|wie|geht|läuft)/i.test(userMsg)) return "checkin";
  if (/(problem|schwer|struggle|fail|scheiße|fuck)/i.test(userMsg)) return "struggle";
  if (/(geschafft|super|toll|great|success|erfolgreich)/i.test(userMsg)) return "success";
  if (/(motivation|hilfe|support)/i.test(userMsg)) return "motivation";
  return "default";
}