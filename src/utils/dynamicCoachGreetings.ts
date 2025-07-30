import { CoachMemory } from '@/hooks/useCoachMemory';

export interface GreetingContext {
  firstName: string;
  coachId: string;
  memory?: CoachMemory | null;
  isFirstConversation: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isWeekend: boolean;
}

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

const getDayOfWeek = (): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  return days[new Date().getDay()];
};

export const createGreetingContext = (firstName: string, coachId: string, memory?: CoachMemory | null, isFirstConversation: boolean = false): GreetingContext => {
  const dayOfWeek = getDayOfWeek();
  return {
    firstName,
    coachId,
    memory,
    isFirstConversation,
    timeOfDay: getTimeOfDay(),
    dayOfWeek,
    isWeekend: dayOfWeek === 'saturday' || dayOfWeek === 'sunday'
  };
};

// Coach-specific greeting variations
const LUCY_GREETINGS = {
  new: [
    "Hey {firstName}! 💗 Ich bin Lucy, deine Ernährungs- und Lifestyle-Expertin. Was beschäftigt dich im Moment beim Thema Ernährung oder Lifestyle?",
    "Hi {firstName}! 🌸 Lucy hier - ich helfe dir dabei, deine Ernährung und deinen Lifestyle zu optimieren. Womit kann ich dir heute helfen?",
    "Hallo {firstName}! 💚 Schön, dass du da bist! Ich bin Lucy und freue mich darauf, dich bei deiner Ernährungsreise zu begleiten. Was steht an?"
  ],
  morning: [
    "Guten Morgen {firstName}! 🌅 Wie ist dein Start in den Tag gelaufen? Hast du schon an ein gesundes Frühstück gedacht?",
    "Morgen {firstName}! ☀️ Ich hoffe, du bist gut in den Tag gestartet. Was steht heute bei dir im Fokus?",
    "Einen wunderschönen Morgen, {firstName}! 🌻 Wie fühlst du dich heute? Lass uns den Tag perfekt beginnen!",
    "Guten Morgen, Sunshine! 🌞 Ready für einen großartigen Tag, {firstName}?",
    "Hi {firstName}! 🌸 Neuer Tag, neue Möglichkeiten! Was darf ich heute für dich tun?"
  ],
  afternoon: [
    "Hi {firstName}! 🌻 Wie läuft dein Tag bisher? Zeit für eine kleine Pause und ein Check-in?",
    "Hallo {firstName}! ☀️ Mittag schon geschafft? Wie geht's dir denn heute?",
    "Hey {firstName}! 💛 Halbzeit des Tages - wie stehst du so da? Alles im grünen Bereich?",
    "Hi {firstName}! 🌼 Wie war dein Vormittag? Erzähl mal, was bei dir los ist!",
    "Servus {firstName}! 🌸 Zeit für eine kleine Verschnaufpause? Wie geht's dir heute?"
  ],
  evening: [
    "Guten Abend {firstName}! 🌙 Wie war dein Tag? Zeit, ein bisschen zu entspannen und zu reflektieren?",
    "Abend {firstName}! ✨ Langer Tag gehabt? Lass uns schauen, wie wir ihn schön ausklingen lassen können.",
    "Hi {firstName}! 🌆 Der Tag neigt sich dem Ende zu - wie fühlst du dich? Was beschäftigt dich?",
    "Guten Abend! 💫 Zeit zum Entspannen, {firstName}? Erzähl mir, wie dein Tag war.",
    "Hey {firstName}! 🌸 Schöner Abend heute! Wie geht's dir denn so?"
  ],
  weekend: [
    "Wochenende, {firstName}! 🎉 Zeit zum Entspannen oder hast du besondere Pläne? Wie kann ich dir helfen?",
    "Hey {firstName}! 🌟 Endlich Wochenende! Gönnst du dir was Besonderes oder planst du etwas Gesundes?",
    "Hi {firstName}! 💃 Wochenend-Vibes! Wie verbringst du deine freie Zeit? Lass mich Teil davon sein!",
    "Hallo {firstName}! 🎈 Wochenende ist da! Zeit für Self-Care oder neue Experimente in der Küche?"
  ],
  success_focused: [
    "Hey {firstName}! 🌟 Du machst das so toll! Wie fühlst du dich heute mit deinen Fortschritten?",
    "Hi {firstName}! 💪 Ich bin so stolz auf dich! Was steht heute auf deiner Erfolgsliste?",
    "Hallo {firstName}! ✨ Du bist auf so einem guten Weg! Erzähl mir, wie es dir heute geht.",
    "Hey {firstName}! 🎯 Deine Entwicklung ist beeindruckend! Was beschäftigt dich heute?"
  ],
  supportive: [
    "Hey {firstName}! 💝 Ich bin für dich da. Wie geht's dir heute? Lass uns zusammen schauen, was möglich ist.",
    "Hi {firstName}! 🤗 Du schaffst das! Wie fühlst du dich heute? Womit kann ich dir helfen?",
    "Hallo {firstName}! 💚 Denk dran - jeder kleine Schritt zählt. Wie steht's denn heute bei dir?",
    "Hey {firstName}! 🌈 Auch schwierige Tage gehören dazu. Erzähl mir, wie's dir geht."
  ]
};

const SASCHA_GREETINGS = {
  new: [
    "Hi {firstName}! 🎯 Ich bin Sascha, dein Personal Trainer. Was ist dein aktuelles Trainingsziel?",
    "Hey {firstName}! 💪 Sascha hier - dein Trainer für effektives Training. Bereit durchzustarten?",
    "Hallo {firstName}! 🏋️ Willkommen im Team! Ich bin Sascha und helfe dir, deine Ziele zu erreichen. Was steht an?"
  ],
  morning: [
    "Morgen {firstName}! 💪 Bereit für ein produktives Training heute? Was ist der Plan?",
    "Hey {firstName}! 🔥 Früh am Start - das gefällt mir! Was steht heute auf dem Trainingsplan?",
    "Guten Morgen {firstName}! 🎯 Motivation ist da, oder? Lass uns das nutzen!",
    "Morgen {firstName}! 🏃 Early Bird! Respekt. Was wollen wir heute erreichen?",
    "Hi {firstName}! ⚡ Starker Start in den Tag! Worauf fokussieren wir uns heute?"
  ],
  afternoon: [
    "Hi {firstName}! 🎯 Zeit für das Training oder erstmal Check-in? Wie läuft der Tag?",
    "Hey {firstName}! 💪 Mittag geschafft! Wie sieht's aus - Energie für's Training da?",
    "Servus {firstName}! 🔥 Halbzeit! Wie stehst du heute da? Alles nach Plan?",
    "Hi {firstName}! ⚡ Wie war der Vormittag? Ready für den nächsten Move?",
    "Hey {firstName}! 🎲 Zeit für Action oder brauchst du erstmal ein Update? Du entscheidest!"
  ],
  evening: [
    "Abend {firstName}! 🌆 Langer Tag? Zeit für entspanntes Training oder Recovery?",
    "Hey {firstName}! 💪 Feierabend-Modus? Lass uns schauen, was heute noch geht.",
    "Hi {firstName}! 🎯 Der Tag neigt sich - wie steht's um deine Energie? Was ist möglich?",
    "Guten Abend {firstName}! 🔥 Noch Kraft für eine Session oder eher Recovery-Talk?",
    "Servus {firstName}! ⚡ Ende vom Tag - wie geht's dir? Was brauchst du jetzt?"
  ],
  weekend: [
    "Wochenende {firstName}! 🎉 Zeit für intensives Training oder eher entspannt angehen?",
    "Hey {firstName}! 💪 Wochenend-Power! Wie nutzen wir die freie Zeit optimal?",
    "Hi {firstName}! 🔥 Samstag/Sonntag - deine Zeit! Was ist der Plan?",
    "Wochenende, {firstName}! 🎯 Entspannung oder Challenge? Du entscheidest!"
  ],
  motivational: [
    "Hey {firstName}! 🚀 Du machst Fortschritte! Wie fühlst du dich mit deiner Entwicklung?",
    "Hi {firstName}! 💪 Stark wie immer! Was steht heute an? Lass uns weitermachen!",
    "Servus {firstName}! 🔥 Deine Konstanz zahlt sich aus! Ready für den nächsten Schritt?",
    "Hey {firstName}! ⚡ Momentum ist da! Wie wollen wir das heute nutzen?"
  ],
  challenge_focused: [
    "Hi {firstName}! 🎯 Bereit für eine neue Herausforderung heute? Was sagst du?",
    "Hey {firstName}! 💪 Zeit, Grenzen zu verschieben! Bock auf was Neues?",
    "Servus {firstName}! 🔥 Comfort Zone verlassen? Lass uns schauen, was geht!",
    "Hi {firstName}! ⚡ Next Level wartet! Ready to push?"
  ]
};

const KAI_GREETINGS = {
  new: [
    "Hey {firstName}! 💪 Ich bin Kai, dein Mindset- und Recovery-Spezialist. Woran arbeitest du gerade?",
    "Hi {firstName}! 🧠 Kai hier - ich helfe dir bei Mindset und Recovery. Was beschäftigt dich?",
    "Hallo {firstName}! ⚡ Willkommen! Ich bin Kai und unterstütze dich mental und körperlich. Ready?"
  ],
  morning: [
    "Morgen {firstName}! ⚡ Wie startest du mental in den Tag? Mindset schon on point?",
    "Hey {firstName}! 🧠 Fresh start! Wie ist deine Energie heute? Lass uns das optimieren!",
    "Guten Morgen {firstName}! 💫 Der Tag gehört dir! Wie sieht dein Mental Game heute aus?",
    "Morgen {firstName}! 🚀 Early Bird! Wie ist deine Verfassung? Ready to rock?",
    "Hi {firstName}! ✨ Neuer Tag, neue Power! Wie fühlst du dich mental?"
  ],
  afternoon: [
    "Hi {firstName}! 💫 Wie ist dein Energy-Level? Zeit für einen Mindset-Boost?",
    "Hey {firstName}! 🧠 Mittag geschafft! Wie läuft's mental bei dir? Alles im Flow?",
    "Servus {firstName}! ⚡ Halbzeit-Check! Wie stehst du da? Brauchst du einen Reset?",
    "Hi {firstName}! 🌟 Wie war der Vormittag? Ready für den Power-Push am Nachmittag?",
    "Hey {firstName}! 💪 Zeit für Reflektion oder Action? Was brauchst du jetzt?"
  ],
  evening: [
    "Abend {firstName}! 🌙 Zeit zum Runterkommen? Wie war dein Tag mental?",
    "Hey {firstName}! ✨ Tag fast geschafft! Zeit für Recovery und Reflektion?",
    "Hi {firstName}! 💫 Feierabend-Modus? Lass uns schauen, wie du am besten entspannst.",
    "Guten Abend {firstName}! 🧘 Zeit, den Tag zu reflektieren und loszulassen?",
    "Servus {firstName}! 🌆 Langer Tag? Erzähl mir, wie's dir geht und was du brauchst."
  ],
  weekend: [
    "Wochenende {firstName}! 🎉 Zeit für mentale Erholung oder neue Challenges?",
    "Hey {firstName}! 💫 Wochenend-Vibes! Wie nutzt du die Zeit für dich?",
    "Hi {firstName}! ⚡ Samstag/Sonntag - deine Zeit! Recovery oder Growth?",
    "Wochenende, {firstName}! 🌟 Entspannung oder persönliche Entwicklung? Oder beides?"
  ],
  mindset_focused: [
    "Hey {firstName}! 🧠 Dein Mindset entwickelt sich toll! Wie fühlst du dich heute?",
    "Hi {firstName}! ⚡ Mental stark wie immer! Was beschäftigt dich heute?",
    "Servus {firstName}! 💫 Du gehst deinen Weg! Erzähl mir, was in dir vorgeht.",
    "Hey {firstName}! 🚀 Deine mentale Stärke ist beeindruckend! Was steht an?"
  ],
  recovery_focused: [
    "Hi {firstName}! 🧘 Zeit für Recovery? Wie ist dein Regenerations-Game heute?",
    "Hey {firstName}! 💆 Self-Care auf dem Plan? Wie geht's deinem Körper und Geist?",
    "Servus {firstName}! 🌱 Recovery ist genauso wichtig wie Training! Wie kümmerst du dich um dich?",
    "Hi {firstName}! ✨ Balance ist key! Wie sieht deine Regeneration heute aus?"
  ]
};

const MARKUS_GREETINGS = {
  new: [
    "Servus {firstName}! 🏋️‍♂️ Hier ist der Maggus - isch bin zurück! Bock auf echtes Training oder willste wie'n Wellensittich aussehen? Schwer und falsch - des is unumgänglich! Muss net schmegge, muss wirge!",
    "Hajo {firstName}! 💪 Der Maggus hier! Ready für hardcore Training? Oder biste nur zum schnacke da?",
    "Servus {firstName}! 🔥 Maggus meldet sich! Isch hoffe du bist net nur heiße Luft, sondern willst richtig Gas gebe!"
  ],
  morning: [
    "Morsche {firstName}! 🏋️‍♂️ Guude Laune heut? Isch hoff du host net nur Körner gegesse - wir brauche Kraft für heut!",
    "Gude Morsche {firstName}! 💪 Früh am Start - des gefällt dem Maggus! Aber host auch gegesse oder nur Wasser getrunke?",
    "Morsche {firstName}! 🔥 Der frühe Vogel fängt de Wurm - aber ohne Frühstück fangt er nix! Wie steht's?",
    "Gude {firstName}! ⚡ Früh dran, respekt! Aber erzähl dem Maggus - biste bereit für richtige Arbeit?",
    "Morsche {firstName}! 🚀 Zeitig wach - des is gut! Aber Motivation allein reicht net, brauchste auch Kraft!"
  ],
  afternoon: [
    "Hajo {firstName}! 🏋️‍♂️ Mittach! Host schon was gschafft heut oder nur geredet?",
    "Servus {firstName}! 💪 Halbzeit! Wie läuft's? Net nur labern, hoffentlich auch mache!",
    "Gude {firstName}! 🔥 Mittag rum - was host denn heut schon gerisse? Erzähl dem Maggus!",
    "Hajo {firstName}! ⚡ Tag schon halb rum - host auch was vorzuzeige oder nur Zeit verschwendet?",
    "Servus {firstName}! 🚀 Wie steht's? Der Maggus hofft du host heut net nur rumgehange!"
  ],
  evening: [
    "Abend {firstName}! 🌆 Langer Tag? Jetzt bloß net schlapp mache - jetzt fangt des Training erst richtig an!",
    "Servus {firstName}! 🏋️‍♂️ Feierabend? Ha! Für richtige Leut fangt jetzt erst des Training an!",
    "Hajo {firstName}! 💪 Müde? Des kenn isch net! Zeit für's echte Training oder was?",
    "Abend {firstName}! 🔥 Tag fast rum, aber der Maggus is noch lange net fertig! Du auch net, oder?",
    "Servus {firstName}! ⚡ Abends trainiert's sich am beste - weniger Quatscher im Studio! Ready?"
  ],
  weekend: [
    "Wochenend {firstName}! 🎉 Andere entspanne, wir trainiere! Des is der Unterschied!",
    "Servus {firstName}! 💪 Samstag/Sonntag - perfekt für intensive Sessions! Andere schlafe, wir schaffe!",
    "Hajo {firstName}! 🔥 Wochenende is Training-Zeit! Während andere Party mache, mache wir Muskeln!",
    "Wochenend {firstName}! 🏋️‍♂️ Zeit die andere verschwende - wir nutze sie richtig! Bock?"
  ],
  motivational: [
    "Hey {firstName}! 🚀 Du machst Fortschritte, des sieht sogar der Maggus! Aber jetzt net nachlasse!",
    "Servus {firstName}! 💪 Gut so! Aber zufrieden sein kommt nach dem Tod! Weiter mache!",
    "Hajo {firstName}! 🔥 Des läuft bei dir! Aber der Maggus will mehr sehe - gib Gas!",
    "Hey {firstName}! ⚡ Fortschritt is da, aber Stillstand is Rückschritt! Also weiter!"
  ],
  tough_love: [
    "Servus {firstName}! 🏋️‍♂️ Hoffst du der Maggus war gestern zu hart? Vergiss es - heut wird's noch härter!",
    "Hajo {firstName}! 💪 Gestern war nur Aufwärme! Heut zeig isch dir was Training bedeutet!",
    "Hey {firstName}! 🔥 Der Maggus macht kenne Gefangene! Bereit für die nächste Runde?",
    "Servus {firstName}! ⚡ Meckern hilft net - mache hilft! Also los!"
  ]
};

const DR_VITA_GREETINGS = {
  new: [
    "Hallo {firstName}! 👩‍⚕️ Ich bin Dr. Vita Femina, deine Hormon-Expertin. Wie kann ich dir helfen?",
    "Guten Tag {firstName}! 🌸 Dr. Vita hier - ich begleite dich ganzheitlich bei deiner Gesundheit. Was beschäftigt dich?",
    "Hallo {firstName}! 💚 Schön, dass du da bist! Ich bin Dr. Vita und freue mich darauf, dich zu unterstützen."
  ],
  morning: [
    "Guten Morgen {firstName}! 🌅 Wie ist dein Start in den Tag? Hörst du auf deinen Körper?",
    "Morgen {firstName}! ☀️ Ein neuer Tag, neue Möglichkeiten für deine Gesundheit. Wie fühlst du dich?",
    "Guten Morgen {firstName}! 🌻 Wie war deine Nacht? Ausreichend Regeneration ist so wichtig.",
    "Morgen {firstName}! 💫 Der Körper sendet uns morgens wichtige Signale. Wie nimmst du dich wahr?",
    "Guten Tag {firstName}! 🌸 Wie beginnst du heute? Achtsamkeit für dich selbst ist der erste Schritt."
  ],
  afternoon: [
    "Hallo {firstName}! 🌼 Wie läuft dein Tag? Zeit für eine kleine Gesundheits-Check-in?",
    "Guten Tag {firstName}! ☀️ Halbzeit des Tages - wie geht es dir körperlich und mental?",
    "Hi {firstName}! 💚 Wie fühlst du dich heute? Manchmal ist eine Pause genau das Richtige.",
    "Hallo {firstName}! 🌱 Zeit innezuhalten - wie geht es dir wirklich?",
    "Guten Tag {firstName}! 🌿 Dein Wohlbefinden liegt mir am Herzen. Erzähl mir, wie's dir geht."
  ],
  evening: [
    "Guten Abend {firstName}! 🌙 Zeit zur Ruhe zu kommen. Wie war dein Tag für deine Gesundheit?",
    "Abend {firstName}! ✨ Der Tag neigt sich - Zeit für Selbstfürsorge und Reflektion?",
    "Guten Abend {firstName}! 🌆 Wie klangst du heute aus? Recovery ist genauso wichtig wie Aktivität.",
    "Hallo {firstName}! 💫 Abendzeit - perfekt um auf den Tag zurückzublicken. Wie ging's dir?",
    "Guten Abend {firstName}! 🌸 Zeit für dich selbst. Was brauchst du jetzt für dein Wohlbefinden?"
  ],
  weekend: [
    "Schönes Wochenende {firstName}! 🌺 Zeit für bewusste Selbstfürsorge? Wie verbringst du deine freie Zeit?",
    "Hallo {firstName}! 💫 Wochenende bedeutet Zeit für dich. Was tut dir besonders gut?",
    "Guten Tag {firstName}! 🌿 Wochenend-Entspannung oder aktive Erholung? Was braucht dein Körper?",
    "Hallo {firstName}! 🌸 Das Wochenende gehört dir! Wie nutzt du es für deine Gesundheit?"
  ],
  empathetic: [
    "Hallo {firstName}! 💚 Ich spüre, dass du durchmachst. Du bist nicht allein - erzähl mir, wie's dir geht.",
    "Hi {firstName}! 🤗 Schwierige Zeiten gehören zum Leben. Wie kann ich dich unterstützen?",
    "Hallo {firstName}! 🌱 Jeder Tag ist anders. Heute ist ein neuer Anfang - wie fühlst du dich?",
    "Guten Tag {firstName}! 💫 Du schaffst das! Kleine Schritte sind auch Fortschritte. Erzähl mir von dir."
  ],
  scientific: [
    "Hallo {firstName}! 👩‍⚕️ Basierend auf aktueller Forschung - wie können wir deine Gesundheit optimieren?",
    "Guten Tag {firstName}! 🔬 Die Wissenschaft zeigt uns viele Wege zur Gesundheit. Welcher passt zu dir?",
    "Hi {firstName}! 📊 Daten und Intuition - beides ist wichtig. Wie geht's dir heute?",
    "Hallo {firstName}! 🧬 Jeder Körper ist einzigartig. Lass uns deine individuelle Lösung finden."
  ]
};

const DR_SOPHIA_GREETINGS = {
  new: [
    "Namaste {firstName}! 🙏 Ich bin Dr. Sophia Integral - bereit für eine transformative Reise durch die 4 Quadranten deiner Gesundheit?",
    "Hallo {firstName}! 🧠 Dr. Sophia hier - ich betrachte dich integral: Individuum & System, Innerlich & Äußerlich. Lass uns alle Perspektiven erkunden.",
    "Grüße {firstName}! ✨ Willkommen zur ganzheitlichen Entwicklung. Bereit, deine Entwicklungslinien zu entfalten?"
  ],
  morning: [
    "Guten Morgen {firstName}! 🌅 Heute erforschen wir neue Entwicklungsebenen. In welchem Quadranten startest du?",
    "Namaste {firstName}! ☀️ Jeder Morgen ist eine Entwicklungschance. Welche Perspektive nehmen wir heute ein?",
    "Morgen {firstName}! 🧠 Die Integral Theory zeigt: Wachstum entsteht durch Perspektivenwechsel. Wo stehst du?",
    "Guten Morgen {firstName}! 🌟 4 Quadranten, unendliche Möglichkeiten. Welchen erkunden wir zuerst?",
    "Morgen {firstName}! 💫 Bewusstseinsentwicklung kennt keine Grenzen. Bereit für den nächsten Level?"
  ],
  afternoon: [
    "Namaste {firstName}! 🌞 Zeit für systemische Betrachtung - wie interagieren deine Entwicklungslinien heute?",
    "Hallo {firstName}! 🧠 Halbzeit des Tages - perfect für Quadranten-Analyse. Wo siehst du Dissonanzen?",
    "Grüße {firstName}! 💫 Integral bedeutet: Alle Perspektiven gelten. Welche übersehen wir noch?",
    "Guten Tag {firstName}! 🌱 Wie ist dein Energiefluss heute? Balance zwischen Aktion und Sein?",
    "Hallo {firstName}! ✨ Der Tag entfaltet sich - genau wie dein Bewusstsein. Welche Erkenntnisse zeigen sich?"
  ],
  evening: [
    "Guten Abend {firstName}! 🌙 Die Abendstunden laden zur Innenschau ein. Was hat dir der Tag gezeigt?",
    "Namaste {firstName}! 🌆 Zeit für Integration und Dankbarkeit. Welche Geschenke hat dir der Tag gebracht?",
    "Abend {firstName}! ✨ Die Dunkelheit gebiert neue Weisheit. Bereit für tiefere Erkenntnisse?",
    "Guten Abend {firstName}! 💫 Reflexion und Loslassen - welche Transformation wartet auf dich?",
    "Hallo {firstName}! 🌸 Der Tag vollendet sich. Wie integrierst du die gewonnenen Erfahrungen?"
  ],
  weekend: [
    "Schönes Wochenende {firstName}! 🌺 Zeit für bewusste Langsamkeit und tiefere Verbindung. Wie nährst du deine Seele?",
    "Namaste {firstName}! 💫 Das Wochenende öffnet Räume für spirituelle Praxis. Welche Rituale rufen dich?",
    "Hallo {firstName}! 🌿 Freie Zeit ist Raum für freie Entwicklung. Welche Aspekte deines Seins möchtest du erforschen?",
    "Grüße {firstName}! ✨ Wochenend-Energie für ganzheitliche Regeneration. Körper, Geist und Seele - was brauchen sie?"
  ],
  philosophical: [
    "Namaste {firstName}! 🙏 Wie Leonardo da Vinci sagte: 'Das Leben ist die Kunst des Zeichnens ohne Radiergummi.' Welche Linien ziehst du heute?",
    "Hallo {firstName}! 🌟 'Der Weg ist das Ziel' - wie erlebst du deinen Weg heute? Jeder Schritt ist Transformation.",
    "Grüße {firstName}! ✨ 'In der Ruhe liegt die Kraft' - aber auch in der bewussten Bewegung. Wo findest du deine Balance?",
    "Guten Tag {firstName}! 💫 'Sei du selbst die Veränderung, die du dir wünschst für diese Welt.' Wie lebst du das heute?"
  ],
  transformational: [
    "Namaste {firstName}! 🌟 Ich spüre eine kraftvolle Transformation in dir. Welche neuen Ebenen zeigen sich?",
    "Hallo {firstName}! ✨ Deine Entwicklung ist beeindruckend - Körper, Geist und Seele im Einklang. Wie erlebst du das?",
    "Grüße {firstName}! 💫 Du bist auf einem wunderbaren Weg der Integration. Welche Erkenntnisse begleiten dich?",
    "Guten Tag {firstName}! 🌱 Wachstum geschieht in dir - auf allen Ebenen. Wie nimmst du diese Evolution wahr?"
  ]
};

const getRecentSuccesses = (memory?: CoachMemory | null): string[] => {
  return memory?.conversation_context?.success_moments?.slice(-3).map(s => s.achievement) || [];
};

const getRecentStruggles = (memory?: CoachMemory | null): string[] => {
  return memory?.conversation_context?.struggles_mentioned?.slice(-2).map(s => s.struggle) || [];
};

const getRelationshipStage = (memory?: CoachMemory | null): string => {
  return memory?.relationship_stage || 'new';
};

export const generateDynamicCoachGreeting = (context: GreetingContext): string => {
  const { firstName, coachId, memory, isFirstConversation, timeOfDay, dayOfWeek, isWeekend } = context;
  
  console.log('generateDynamicCoachGreeting called with coachId:', coachId);
  
  if (isFirstConversation) {
    return getFirstTimeGreeting(coachId, firstName);
  }

  const relationshipStage = getRelationshipStage(memory);
  const recentSuccesses = getRecentSuccesses(memory);
  const recentStruggles = getRecentStruggles(memory);
  const trustLevel = memory?.trust_level || 0;

  // Choose greeting category based on context
  let greetingCategory: string = timeOfDay;
  
  if (isWeekend) {
    greetingCategory = 'weekend';
  } else if (recentSuccesses.length > 0 && trustLevel > 60) {
    greetingCategory = getSuccessGreetingCategory(coachId);
  } else if (recentStruggles.length > 0) {
    greetingCategory = getSupportiveGreetingCategory(coachId);
  } else if (relationshipStage === 'close' && Math.random() < 0.3) {
    greetingCategory = getSpecialGreetingCategory(coachId);
  }

  return getGreetingByCoachAndCategory(coachId, greetingCategory, firstName, memory);
};

const getFirstTimeGreeting = (coachId: string, firstName: string): string => {
  const greetings: Record<string, string[]> = {
    lucy: LUCY_GREETINGS.new,
    sascha: SASCHA_GREETINGS.new,
    kai: KAI_GREETINGS.new,
    markus: MARKUS_GREETINGS.new,
    dr_vita_femina: DR_VITA_GREETINGS.new,
    dr_vita: DR_VITA_GREETINGS.new,
    vita: DR_VITA_GREETINGS.new,
    integral: DR_SOPHIA_GREETINGS.new,
    sophia: DR_SOPHIA_GREETINGS.new
  };

  const coachGreetings = greetings[coachId] || greetings.sascha;
  const randomGreeting = coachGreetings[Math.floor(Math.random() * coachGreetings.length)];
  return randomGreeting.replace('{firstName}', firstName);
};

const getSuccessGreetingCategory = (coachId: string): string => {
  const successCategories: Record<string, string> = {
    lucy: 'success_focused',
    sascha: 'motivational',
    kai: 'mindset_focused',
    markus: 'motivational',
    dr_vita_femina: 'empathetic',
    dr_vita: 'empathetic',
    vita: 'empathetic',
    integral: 'transformational',
    sophia: 'transformational'
  };
  return successCategories[coachId] || 'motivational';
};

const getSupportiveGreetingCategory = (coachId: string): string => {
  const supportCategories: Record<string, string> = {
    lucy: 'supportive',
    sascha: 'challenge_focused',
    kai: 'recovery_focused',
    markus: 'tough_love',
    dr_vita_femina: 'empathetic',
    dr_vita: 'empathetic',
    vita: 'empathetic',
    integral: 'philosophical',
    sophia: 'philosophical'
  };
  return supportCategories[coachId] || 'supportive';
};

const getSpecialGreetingCategory = (coachId: string): string => {
  const specialCategories: Record<string, string> = {
    lucy: 'success_focused',
    sascha: 'challenge_focused',
    kai: 'mindset_focused',
    markus: 'tough_love',
    dr_vita_femina: 'scientific',
    dr_vita: 'scientific',
    vita: 'scientific',
    integral: 'philosophical',
    sophia: 'philosophical'
  };
  return specialCategories[coachId] || 'morning';
};

const getGreetingByCoachAndCategory = (coachId: string, category: string, firstName: string, memory?: CoachMemory | null): string => {
  const allGreetings: Record<string, any> = {
    lucy: LUCY_GREETINGS,
    sascha: SASCHA_GREETINGS,
    kai: KAI_GREETINGS,
    markus: MARKUS_GREETINGS,
    dr_vita_femina: DR_VITA_GREETINGS,
    dr_vita: DR_VITA_GREETINGS,
    vita: DR_VITA_GREETINGS,
    integral: DR_SOPHIA_GREETINGS,
    sophia: DR_SOPHIA_GREETINGS
  };

  const coachGreetings = allGreetings[coachId] || allGreetings.sascha;
  const categoryGreetings = coachGreetings[category] || coachGreetings.morning;
  
  const randomGreeting = categoryGreetings[Math.floor(Math.random() * categoryGreetings.length)];
  let greeting = randomGreeting.replace('{firstName}', firstName);

  // Add contextual elements for close relationships
  if (memory?.relationship_stage === 'close' && Math.random() < 0.3) {
    const recentSuccesses = getRecentSuccesses(memory);
    if (recentSuccesses.length > 0) {
      const successRef = getSuccessReference(coachId, recentSuccesses[0]);
      greeting += ` ${successRef}`;
    }
  }

  return greeting;
};

const getSuccessReference = (coachId: string, success: string): string => {
  const references: Record<string, string[]> = {
    lucy: [
      "Übrigens - ich hab gesehen, wie toll du das mit dem Essen machst! 💚",
      "Du bist echt auf einem super Weg mit deiner Ernährung! 🌟",
      "Deine Konstanz beeindruckt mich wirklich! 💗"
    ],
    sascha: [
      "Apropos - respekt für deine Fortschritte! 💪",
      "Übrigens - deine Entwicklung kann sich sehen lassen! 🎯",
      "Du ziehst das echt konsequent durch! 🔥"
    ],
    kai: [
      "Ich merk übrigens, wie stark du mental geworden bist! 🧠",
      "Deine Mindset-Entwicklung ist beeindruckend! ⚡",
      "Du gehst deinen Weg so bewusst - respect! 💫"
    ],
    markus: [
      "Apropos - respekt für deine harte Arbeit! Net labern, mache! 💪",
      "Übrigens - du machst Fortschritte, des sieht sogar der Maggus! 🏋️‍♂️",
      "Du ziehst das durch wie'n echter Kämpfer! 🔥"
    ],
    dr_vita_femina: [
      "Ich bewundere, wie achtsam du mit dir umgehst! 🌸",
      "Deine bewusste Selbstfürsorge zahlt sich aus! 💚",
      "Du hörst so gut auf deinen Körper! 🌿"
    ],
    dr_vita: [
      "Ich bewundere, wie achtsam du mit dir umgehst! 🌸",
      "Deine bewusste Selbstfürsorge zahlt sich aus! 💚",
      "Du hörst so gut auf deinen Körper! 🌿"
    ],
    vita: [
      "Ich bewundere, wie achtsam du mit dir umgehst! 🌸",
      "Deine bewusste Selbstfürsorge zahlt sich aus! 💚",
      "Du hörst so gut auf deinen Körper! 🌿"
    ],
    integral: [
      "Deine ganzheitliche Entwicklung ist wunderschön zu beobachten! ✨",
      "Ich sehe, wie du Körper, Geist und Seele integrierst! 🌟",
      "Deine Transformation geschieht auf allen Ebenen! 💫"
    ],
    sophia: [
      "Deine ganzheitliche Entwicklung ist wunderschön zu beobachten! ✨",
      "Ich sehe, wie du Körper, Geist und Seele integrierst! 🌟",
      "Deine Transformation geschieht auf allen Ebenen! 💫"
    ]
  };

  const coachRefs = references[coachId] || references.sascha;
  return coachRefs[Math.floor(Math.random() * coachRefs.length)];
};