// src/intake/lexicon.ts

export const ACTION_TOKENS = [
  'analyse','analysier','analysiere','analysieren','analysis','bewerte','bewertung',
  'check','checke','checken','chek','cheks','hceck','hcecken',
  'prüf','prüfe','prüfen','pruef','pruefe','pruefen','überprüf','überprüfen','ueberpruef','ueberpruefen',
  'review','evaluate','assess','inspect','scan',
  'speicher','speichern','speichere','save','add','hinzufügen','hinzufuegen','addiere','log','eintragen',
  'aktualisiere','aktualisieren','update','anpassen','ändern','aendere','edit',
  'plan','plane','planung','erstelle','generiere','recommend','empfehle','vorschlag','vorschläge','ideen',
  'vergleiche','vergleich','trend','verlauf','warum','wieso','erklaer','erkläre','explain',
  'erinnern','reminder','notify','benachrichtige'
];

export const DOMAIN_TOKENS: Record<string, string[]> = {
  supplement: ['supplement','supplements','nahrungsergänzung','nahrungsergaenzung','stack','vitamin','vitamine','mineral','mineralien','präparat','praeparat','suplement','supplemnt','supps'],
  meal: ['meal','meals','mahlzeit','mahlzeiten','essen','food','zutaten','kalorien','kcal','protein','eiweiß','eiweiss','carbs','kohlenhydrate','fette','rezept','rezepte'],
  training: ['training','workout','übung','uebung','übungen','uebungen','exercise','reps','satz','saetze','sets','gewicht','kg','rpe','plan','split','bankdrücken','kniebeugen','kreuzheben','latzug','rudern','ohp','traing','traning'],
  sleep: ['schlaf','sleep','schlafrhythmus','insomnia','schlafdauer','schlafqualität','schlafqualitaet'],
  weight: ['gewicht','wiegen','waage','kg','kilos','bodyweight','abnahme','zunahme'],
  progress: ['progress','fortschritt','körperfoto','koerperfotos','vorher','nachher','progresspic','umfänge','umfaenge'],
  diary: ['tagebuch','journal','diary','eintrag','einträge','eintraege','mindset','notiz'],
  hydrate: ['wasser','trinken','flüssigkeit','fluessigkeit','hydration','getränk','getraenk','liter','ml'],
  goals: ['abnehmen','zunehmen','muskelaufbau','muskelabbau','cut','bulk','definition','leistung','performance','ausdauer'],
};
