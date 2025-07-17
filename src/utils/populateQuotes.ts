import { supabase } from '@/integrations/supabase/client';

// Parsed quotes from the website
const menQuotes = [
  {
    quote_text: "Es ist leichter, Liebhaber als Ehemann zu sein, weil es schwerer ist, alle Tage Geist zu haben, als von Zeit zu Zeit eine hübsche Bemerkung zu machen.",
    author: "Honoré de Balzac"
  },
  {
    quote_text: "Oft sind es gut genutzte Mußestunden, in welchen der Mensch das Tor zu einer neuen Welt findet.",
    author: "George M. Adams"
  },
  {
    quote_text: "Der Körper ist wie ein Auto. Wenn man gut darauf aufpasst, hat man am Ende ein Vintagemodell.",
    author: "Karl Lagerfeld"
  },
  {
    quote_text: "Gepflegte Männer kommen besser an!",
    author: "Tonsus"
  },
  {
    quote_text: "Ein Junggeselle ist ein Mann, der nur ein einziges Problem hat - und das ist lösbar.",
    author: "Woody Allen"
  },
  {
    quote_text: "Der wahre Junggeselle kommt jeden Morgen aus einer anderen Richtung ins Büro.",
    author: "Frank Sinatra"
  },
  {
    quote_text: "Ändert sich der Zustand der Seele, so ändert dies zugleich auch das Aussehen des Körpers und umgekehrt: ändert sich das Aussehen des Körpers, so ändert dies zugleich auch den Zustand der Seele.",
    author: "Aristoteles"
  },
  {
    quote_text: "Eleganz heißt nicht ins Auge zu fallen, sondern im Gedächtnis bleiben.",
    author: "Giorgio Armani"
  },
  {
    quote_text: "Weißt Du, was es bedeutet, nach Hause zu kommen, zu einer Frau, die Dich liebt, die zärtlich zu Dir ist und auch leidenschaftlich? Es bedeutet: du bist in einer fremden Wohnung gelandet!",
    author: "George Burns"
  },
  {
    quote_text: "Nicht den Tod sollte man fürchten, sondern dass man nie beginnen wird zu leben.",
    author: "Marc Aurel"
  },
  {
    quote_text: "Sei freundlich zu deinem Leib, damit die Seele Lust hat, darin zu wohnen.",
    author: "Theresia von Avila"
  },
  {
    quote_text: "Mit der Liebe ist es wie mit dem Bart, pflegt man ihn nicht, sieht man bald dumm aus.",
    author: "Tonsus"
  },
  {
    quote_text: "Früher rasierte man sich, wenn man Beethoven hören wollte, jetzt hört man Beethoven, wenn man sich rasieren will.",
    author: "Peter Bamm"
  },
  {
    quote_text: "Mit Zwanzig schenkt einem die Natur sein Gesicht. Mit Dreißig ist das Gesicht vom Leben geformt. Wie Ihr Gesicht jedoch mit fünfzig aussieht, liegt ganz an Ihnen.",
    author: "Coco Chanel"
  },
  {
    quote_text: "Der Bart als Geschlechtszeichen mitten im Gesicht ist obszön. Deshalb gefällt er den Weibern.",
    author: "Arthur Schopenhauer"
  },
  {
    quote_text: "Ein Mann ohne Bart ist wie ein Brot ohne Kruste.",
    author: "Lettisches Sprichwort"
  },
  {
    quote_text: "Mit dem Bart im Gesicht ist es wie mit dem Golfrasen: nur kontinuierliche Pflege und Schur bringen ihn zur Perfektion.",
    author: "Tonsus"
  },
  {
    quote_text: "Ich bin stolz auf meine Falten, sie sind das Leben in meinem Gesicht.",
    author: "Brigitte Bardot"
  },
  {
    quote_text: "Die meisten Männer verstehen es überhaupt nicht zu leben, sie nutzen sich nur ab.",
    author: "Charles Bukowski"
  },
  {
    quote_text: "Es ist ein großer Vorteil, die Fehler, aus denen man lernen kann, recht früh zu machen.",
    author: "Winston Churchill"
  },
  {
    quote_text: "Schönheit ist mit Geld nicht aufzuwiegen.",
    author: "Paulo Coelho"
  },
  {
    quote_text: "Ohne Schnurrbart ist ein Mann nicht richtig angezogen.",
    author: "Salvador Dali"
  },
  {
    quote_text: "Tja, sollen sich die Frauen ruhig nach dem Toilettengang die Hände waschen. Wir Männer haben indes gelernt, uns nicht auf die Hände zu pinkeln.",
    author: "Harald Schmidt"
  },
  {
    quote_text: "A good lather is half the shave",
    author: "Englisches Sprichwort"
  },
  {
    quote_text: "A man's face is his autobiography. A woman's face is her work of fiction.",
    author: "Oscar Wilde"
  },
  {
    quote_text: "Menschen, die nach immer größerer Erfüllung jagen, ohne sich jemals Zeit zu gönnen, sie zu genießen, sind wie Hungrige, die immerfort kochen, sich aber nie zu Tische setzen.",
    author: "Marie von Ebner-Eschenbach"
  },
  {
    quote_text: "Was wir am meisten im Leben bedürfen, ist jemand, der uns dazu bringt, das zu tun, wozu wir fähig sind.",
    author: "Ralph Waldo Emerson"
  },
  {
    quote_text: "Man entdeckt keine neuen Kontinente, ohne den Mut zu haben, alte Küsten aus den Augen zu verlieren.",
    author: "André Gide"
  },
  {
    quote_text: "Klassischer materieller Luxus mag nicht mehr ausreichend befriedigen. Die neuen Statussymbole sind Wellness und Gesundheit!",
    author: "GDI-Studie 2008"
  },
  {
    quote_text: "Wir müssen uns beständig verändern, erneuern, verjüngern, andernfalls verhärten wir.",
    author: "Johann Wolfgang von Goethe"
  },
  {
    quote_text: "Man kann nicht immer ein Held sein, aber man kann immer ein Mann sein.",
    author: "Johann Wolfgang von Goethe"
  },
  {
    quote_text: "Ein Gentleman ist ein Mann, der immer weiß, wie weit er bei einer Frau zu weit gehen darf.",
    author: "Alec Guinness"
  },
  {
    quote_text: "Ein Gentleman ist ein Mann, der eine unfaire Handlung auch dann bedauert, wenn sie von Erfolg gekrönt war.",
    author: "Sir Harold Wilson"
  },
  {
    quote_text: "The right man can make you feel comfortable wherever you are, and that's sexy.",
    author: "Selita Ebanks"
  },
  {
    quote_text: "Sobald jemand in einer Sache Meister geworden ist, sollte er in einer neuen Sache Schüler werden.",
    author: "Gerhart Hauptmann"
  },
  {
    quote_text: "Wenn Du an dir nicht Freude hast, die Welt wird dir nicht Freude machen.",
    author: "Paul Heyse"
  },
  {
    quote_text: "Sei mäßig in allem, atme reine Luft, treibe täglich Hautpflege und Körperübung, halte den Kopf kalt, die Füße warm, und heile ein kleines Weh eher durch Fasten als durch Arznei.",
    author: "Hippokrates von Kos"
  },
  {
    quote_text: "Ein gut gepflegter Körper und ein gut gepflegtes Gesicht stellen ein wichtiges Statussymbol dar: Man schreibt diesen Personen persönliche Disziplin und Perfektion zu, und dies wiederum ist auch eine Vorbedingung für beruflichen Erfolg.",
    author: "Dr. Helene Karmasin"
  },
  {
    quote_text: "Jeder Mensch hat die Chance, mindestens einen Teil der Welt zu verbessern, nämlich sich selbst.",
    author: "Paul Anton de Lagarde"
  },
  {
    quote_text: "Es gibt keinen Luxus ohne Parfum.",
    author: "Karl Lagerfeld"
  },
  {
    quote_text: "Willst du wertvolle Dinge sehen, so brauchst du nur dorthin zu blicken, wohin die große Menge nicht sieht.",
    author: "Laotse"
  },
  {
    quote_text: "Stil ist wichtiger als Modetrends.",
    author: "Yves Saint Laurent"
  },
  {
    quote_text: "Gutes Aussehen und positive Gefühle gehören zusammen.",
    author: "Alexander Lowen"
  },
  {
    quote_text: "Was das Auge freut, erfrischt den Geist, und was den Geist erfrischt, erfrischt den Körper.",
    author: "Prentice Mulford"
  },
  {
    quote_text: "Das Faszinierende am Leben ist: Wenn man darauf besteht, nur das Beste zu bekommen, dann bekommt man es häufig auch.",
    author: "William Somerset Maugham"
  },
  {
    quote_text: "Wer aufhört, besser zu werden, hat aufgehört, gut zu sein.",
    author: "Philip Rosenthal"
  },
  {
    quote_text: "Erfolg im Leben ist etwas Sein, etwas Schein und sehr viel Schwein.",
    author: "Philip Rosenthal"
  },
  {
    quote_text: "Der Geschmack ist die Kunst, sich auf Kleinigkeiten zu verstehen.",
    author: "Jean-Jacques Rousseau"
  },
  {
    quote_text: "Wenn man auf seinen Körper achtet, geht's auch dem Kopf besser.",
    author: "Jil Sander"
  },
  {
    quote_text: "Schönheit ist ein offener Empfehlungsbrief, der die Herzen im Voraus für uns gewinnt.",
    author: "Arthur Schopenhauer"
  },
  {
    quote_text: "Weise Lebensführung gelingt keinem Menschen durch Zufall. Man muss, solange man lebt, lernen, wie man leben soll.",
    author: "Seneca"
  },
  {
    quote_text: "Sorge dafür, das zu haben, was du liebst, oder du wirst gezwungen werden, das zu lieben, was du hast.",
    author: "George Bernard Shaw"
  },
  {
    quote_text: "Die Kunst des Ausruhens ist Teil der Kunst des Arbeitens.",
    author: "John Steinbeck"
  },
  {
    quote_text: "Wir verbringen einen großen Teil des Lebens damit, die Achtung anderer zu erwerben. Aber Selbstachtung zu gewinnen, darauf verwenden wir wenig Zeit.",
    author: "Josef von Sternberg"
  },
  {
    quote_text: "A gentleman will walk but never run.",
    author: "Sting"
  },
  {
    quote_text: "Ein Gentleman ist ein Mann, der seinem Mädchen die Antibabypillen bezahlt.",
    author: "Dan Carter"
  },
  {
    quote_text: "Ein Gentleman vergisst dein Alter, aber nie deinen Geburtstag.",
    author: "Clark Gable"
  },
  {
    quote_text: "Die Frauen haben es ja von Zeit zu Zeit auch nicht leicht. Wir Männer aber müssen uns rasieren.",
    author: "Kurt Tucholsky"
  },
  {
    quote_text: "Menschen mit einer neuen Idee gelten so lange als Spinner, bis sich die Sache durchgesetzt hat.",
    author: "Mark Twain"
  },
  {
    quote_text: "Jeder Mann braucht fünf Ehefrauen: einen Filmstar, ein Dienstmädchen, eine Köchin, eine Zuhörerin und eine Krankenschwester.",
    author: "Mark Twain"
  },
  {
    quote_text: "Keine Frau ist so schlecht, dass sie nicht die bessere Hälfte eines Mannes werden kann.",
    author: "Heinz Erhardt"
  },
  {
    quote_text: "Ein Mann ohne Eitelkeit ist kein Mann.",
    author: "John Wayne"
  },
  {
    quote_text: "Ich habe einen ganz einfachen Geschmack, ich bin immer mit dem Besten zufrieden.",
    author: "Oscar Wilde"
  },
  {
    quote_text: "Der Kultivierte bedauert nie einen Genuss. Der Unkultivierte weiß überhaupt nicht, was ein Genuss ist.",
    author: "Oscar Wilde"
  },
  {
    quote_text: "Wer einmal sich selbst gefunden hat, der kann nichts auf dieser Welt mehr verlieren.",
    author: "Stefan Zweig"
  },
  {
    quote_text: "Try not to become a man of success but rather try to become a man of value.",
    author: "Albert Einstein"
  },
  {
    quote_text: "A man cannot be comfortable without his own approval.",
    author: "Mark Twain"
  },
  {
    quote_text: "Better keep yourself clean and bright; you are the window through which you must see the world.",
    author: "George Bernard Shaw"
  },
  {
    quote_text: "Every man over forty is responsible for his face.",
    author: "Abraham Lincoln"
  },
  {
    quote_text: "Ein Mann ist alt, wenn er seine Komplimente nicht mehr in die Tat umsetzen kann.",
    author: "Charles Boyer"
  },
  {
    quote_text: "A man has to do what a man has to do.",
    author: "Unbekannt"
  },
  {
    quote_text: "Glück ist ein Parfüm, das du nicht auf andere sprühen kannst, ohne selbst ein paar Tropfen abzubekommen.",
    author: "Ralph Waldo Emerson"
  },
  {
    quote_text: "Wenn es dir gelingt, die innere Ruhe zu erobern, so hast du mehr getan als derjenige, der Städte und ganze Reiche erobert hat.",
    author: "Michel de Montaigne"
  },
  {
    quote_text: "Nicht der Wind, sondern die Segel bestimmen den Kurs.",
    author: "Sprichwort"
  },
  {
    quote_text: "Qualität ist niemals Zufall; sie ist immer das Ergebnis hoher Ziele, aufrichtiger Bemühung, intelligenter Vorgehensweise und geschickter Ausführung.",
    author: "Will A. Foster"
  },
  {
    quote_text: "Die größten Ereignisse sind nicht unsere lautesten, sondern unsere stillsten Stunden.",
    author: "Friedrich Wilhelm Nietzsche"
  },
  {
    quote_text: "Die Muße scheint Lust, wahres Glück und seliges Leben in sich selbst zu tragen.",
    author: "Aristoteles"
  },
  {
    quote_text: "Menschen, die die Muße und Ruhe nicht mehr kennen, führen auch im größten Reichtum ein armes Leben.",
    author: "Unbekannt"
  },
  {
    quote_text: "Das Dasein ist köstlich, man muss nur den Mut haben, sein eigenes Leben zu führen.",
    author: "Giacomo Casanova"
  },
  {
    quote_text: "Muße ist das Kunststück, sich selbst ein angenehmer Gesellschafter zu sein.",
    author: "Karl Heinrich Waggerl"
  },
  {
    quote_text: "Charme ist der unsichtbare Teil der Schönheit, ohne den niemand wirklich schön sein kann.",
    author: "Sophia Loren"
  },
  {
    quote_text: "Charme ist ein Mittel, ein 'JA' zu erhalten, ohne präzise eine Frage danach gestellt zu haben.",
    author: "Albert Camus"
  },
  {
    quote_text: "Seife und Bildung wirken nicht so prompt wie ein Massaker, auf lange Sicht aber viel verheerender.",
    author: "Mark Twain"
  },
  {
    quote_text: "Gewinner werden nicht geboren, sondern gemacht – und zwar hauptsächlich von sich selbst.",
    author: "Unbekannt"
  },
  {
    quote_text: "Versuche zu kriegen, was Du liebst, sonst bist Du gezwungen, das zu lieben, was Du kriegst.",
    author: "Unbekannt"
  },
  {
    quote_text: "Alles Behaartsein ist tierisch. Die Rasur ist das Abzeichen höherer Zivilisation.",
    author: "Arthur Schopenhauer"
  },
  {
    quote_text: "Ein kluger Mann macht nicht alle Fehler selbst. Er gibt auch anderen eine Chance.",
    author: "Winston Churchill"
  },
  {
    quote_text: "Jeder Mann von Stil und Niveau ist ein Hypochonder.",
    author: "Molière"
  },
  {
    quote_text: "Die einzigen Männer, die eine Frau zu durchschauen vermögen, sind die Röntgenologen.",
    author: "Sacha Guitry"
  },
  {
    quote_text: "Niemand ist den Frauen gegenüber aggressiver oder herablassender als ein Mann, der seiner Männlichkeit nicht ganz sicher ist.",
    author: "Simone de Beauvoir"
  },
  {
    quote_text: "Alle Männer sind eitel – vor allem jene, die es nicht zugeben.",
    author: "Sean Connery"
  },
  {
    quote_text: "Altern ist eine schlechte Gewohnheit, die ein beschäftigter Mann gar nicht erst aufkommen lässt.",
    author: "André Maurois"
  },
  {
    quote_text: "Bei zwei Sachen wird ein Mann nie zugeben, dass er sie nicht gut kann: Sex und Autofahren.",
    author: "Stirling Moss"
  },
  {
    quote_text: "Der ganze Emanzipationsrummel hat nichts daran geändert, dass Frauen sich schön machen, um Männern zu gefallen.",
    author: "Marcello Mastroianni"
  },
  {
    quote_text: "Das Finanzamt hat mehr Männer zu Lügnern gemacht als die Ehe.",
    author: "Robert Lembke"
  },
  {
    quote_text: "Das Leben von Männern wird von Mangelerscheinungen bestimmt: Sie heiraten aus Mangel an Erfahrung, sie lassen sich scheiden aus Mangel an Geduld, und sie heiraten wieder aus Mangel an Gedächtnis.",
    author: "Paul Heinemann"
  },
  {
    quote_text: "Denn der Wein erneuert die Kraft ermüdeter Männer.",
    author: "Homer"
  }
];

export const populateQuotes = async () => {
  try {
    console.log('Starting to populate quotes...');
    
    // Check if quotes already exist
    const { data: existingQuotes, error: checkError } = await supabase
      .from('men_quotes')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing quotes:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingQuotes && existingQuotes.length > 0) {
      console.log('Quotes already exist in database');
      return { success: true, message: 'Quotes already exist' };
    }

    // Insert all quotes
    const { error: insertError } = await supabase
      .from('men_quotes')
      .insert(menQuotes);

    if (insertError) {
      console.error('Error inserting quotes:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`Successfully inserted ${menQuotes.length} quotes`);
    return { success: true, message: `Inserted ${menQuotes.length} quotes` };
  } catch (error) {
    console.error('Error in populateQuotes:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};