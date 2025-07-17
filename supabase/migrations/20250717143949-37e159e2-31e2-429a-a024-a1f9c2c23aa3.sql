-- Create table for women's quotes
CREATE TABLE public.women_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_text TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (no restrictions needed as quotes are public)
ALTER TABLE public.women_quotes ENABLE ROW LEVEL SECURITY;

-- Create policy for reading quotes (everyone can read)
CREATE POLICY "Anyone can read women quotes" 
ON public.women_quotes 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_women_quotes_updated_at
BEFORE UPDATE ON public.women_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert all women quotes into the database
INSERT INTO public.women_quotes (quote_text, author) VALUES
('Träume dir dein Leben schön und mach aus diesen Träumen eine Realität.', 'Marie Curie'),
('Jeder Mensch hat ein Brett vor dem Kopf – es kommt nur auf die Entfernung an.', 'Marie von Ebner-Eschenbach'),
('Sei die Heldin deines Lebens, nicht das Opfer.', 'Nora Ephron'),
('Lass dich nicht unterkriegen, sie frech und wild und wunderbar!', 'Astrid Lindgren'),
('Leben wird nicht gemessen an der Zahl von Atemzügen, die wir nehmen; sondern an den Momenten, die uns den Atem nehmen.', 'Maya Angelou'),
('Mut brüllt nicht immer nur. Mut kann auch die leise Stimme am Ende des Tages sein, die sagt: Morgen versuche ich es nochmal.', 'Mary Anne Radmacher'),
('Karriere ist etwas Herrliches, aber man kann sich nicht in einer kalten Nacht an ihr wärmen.', 'Marilyn Monroe'),
('Die meisten Menschen geben ihre Macht auf, indem sie denken, sie hätten keine.', 'Alice Walker'),
('Eine Frau ist wie ein Teebeutel - du kannst erst beurteilen, wie stark sie ist, wenn du sie ins Wasser wirfst.', 'Eleanor Roosevelt'),
('Gib niemals auf, für das zu kämpfen, was du tun willst. Mit etwas, wo Leidenschaft und Inspiration ist, kann man nicht falsch liegen.', 'Ella Fitzgerald'),
('Über das Kommen mancher Leute tröstet uns nichts als die Hoffnung auf ihr Gehen.', 'Marie von Ebner-Eschenbach'),
('Was für ein herrliches Leben hatte ich! Ich wünschte nur, ich hätte es früher bemerkt.', 'Colette'),
('Um unersetzbar zu sein, muss man stets anders sein.', 'Coco Chanel'),
('Wenn du etwas gesagt haben willst, frage einen Mann; wenn du etwas erledigt haben willst, frage eine Frau.', 'Margaret Thatcher'),
('Es ist der absolute Luxus, Leidenschaft mit Leistung zu kombinieren. Und es ist der wahre Weg zum Glück.', 'Sheryl Sandberg'),
('Ich möchte, dass man sich an mich als einen Menschen erinnert, der frei sein wollte … damit auch andere frei wären.', 'Rosa Parks'),
('Wir können diese Welt nicht ändern, bevor sich nicht die Individuen ändern.', 'Marie Curie'),
('We are all water in different containers.', 'Yoko Ono'),
('We Should All Be Feminists.', 'Chimamanda Ngozi Adichie'),
('Haben und nichts geben – ist in manchen Fällen schlechter als stehlen.', 'Marie von Ebner-Eschenbach'),
('Ohne Frauen geht es nicht. Das hat sogar Gott einsehen müssen.', 'Eleonora Duse'),
('Man möchte die Zeit festhalten, aber wir müssen sie ausgeben, um mit uns selbst bekannt zu werden.', 'Christa Wolf'),
('Nichts was wir benutzen, hören oder berühren, kann man in Worten so gut ausdrücken wie die Sinne es wahrnehmen.', 'Hannah Arendt'),
('Nächstenliebe lebt mit tausend Seelen, Egoismus mit einer einzigen – und die ist erbärmlich.', 'Marie von Ebner-Eschenbach'),
('Wenn die ganze Welt schweigt, kann auch eine Stimme mächtig sein.', 'Malala Yousafzai'),
('Der Wunsch, stets Frau zu sein, zeigt genau das Denken, das dem weiblichen Geschlecht die Würde nimmt.', 'Mary Wollstonecraft'),
('Frauen, die nichts fordern, werden beim Wort genommen – sie bekommen nichts.', 'Simone de Beauvoir'),
('Pippi verkörpert meine eigene kindliche Sehnsucht danach, einen Menschen zu treffen, der Macht besitzt, aber sie nicht missbraucht.', 'Astrid Lindgren'),
('Weder, dass ich Frau, noch fern bin, kann mich hindern, dich zu lieben. Denn du weißt: die Seelen kennen weder Fern-Sein noch Geschlecht.', 'Juana de la Cruz'),
('Die Mißachtung des Lebens und die Brutalität gegen den Menschen lassen die Fähigkeit des Menschen zur Unmenschlichkeit erkennen.', 'Rosa Luxemburg'),
('Freiheit und Gerechtigkeit bestehen darin, den anderen zurückzugeben, was ihnen gehört.', 'Olympe de Gouges'),
('Zu einem 400-Meter-Lauf treten ein Mann und eine Frau an: Der Mann mit zwanzig Metern Vorsprung und im sportlichen Outfit. Die Frau mit Rucksack, aus dem zwei Kinder gucken, vor ihr mehrere Hürden.', 'Regine Hildebrandt'),
('Frauen sollten auch respektiert werden. Im Allgemeinen werden Männer in allen Teilen der Welt hochgeschätzt, warum haben Frauen nicht ihren Anteil?', 'Anne Frank'),
('Woran du festhältst, das halte fest. Was du tust, das tue und werde nicht müde.', 'Klara von Assisi'),
('Unsere Träume können wir erst dann verwirklichen, wenn wir uns dazu entschließen, einmal daraus zu erwachen.', 'Josephine Baker'),
('Die Frau hat Jahrhunderte lang als Lupe gedient, welche die magische und köstliche Fähigkeit besaß, den Mann doppelt so groß zu zeigen wie er von Natur aus ist.', 'Virginia Woolf'),
('Willst du das Große groß vollbringen, mußt du der eignen Kraft vertrau''n.', 'Louise Otto-Peters'),
('Meine Bibliothek ist ein Archiv der Sehnsüchte.', 'Susan Sontag'),
('Reden ist unser Privileg. Wenn wir ein Problem haben, das wir nicht durch Reden lösen können, dann hat alles keinen Sinn.', 'Rosa Luxemburg'),
('Alles Denken ist Nachdenken, der Sache nachdenken.', 'Hannah Arendt'),
('Wenn das Recht einer jungen Frau auf Unversehrtheit wirklich ernst genommen würde, gäbe es Selbstverteidigung für Frauen als Schulfach.', 'Luisa Francia'),
('In der Natur existiert nichts für sich alleine.', 'Rachel Carson'),
('Ich kann euch sagen, was Freiheit für mich bedeutet: ohne Angst leben.', 'Nina Simone'),
('Ich habe keine Angst vor Stürmen. Ich lerne, wie ich mein Schiff steuern muss.', 'Louisa May Alcott'),
('Nur die mit Leichtigkeit, mit Freude und Lust die Welt sich zu erhalten weiß, die hält sie fest.', 'Bettina von Arnim'),
('Wenn eine Frau zur Realität durchdringt, lernt sie ihren Zorn kennen… und das heißt, sie ist bereit zu handeln.', 'Mary Daly'),
('Einmal im Leben zur rechten Zeit sollte man an Unmögliches geglaubt haben.', 'Christa Wolf'),
('Freiheit ist kein Synonym für Glück, sondern eher für schwierige Entscheidungen.', 'Emma Bonino'),
('Wenn eine Frau beschließt, ihr Leben zu ändern, ändert sich alles um sie herum.', 'Eufrosina Cruz'),
('Ich habe gelernt, dass der Weg des Fortschritts weder kurz noch unbeschwerlich ist.', 'Marie Curie'),
('Man muss Menschen schützen, nicht Grenzen.', 'Giusi Nicolini'),
('Ich habe große Sehnsucht nach dieser ganz besonderen Art von Welt, in der man arbeiten und atmen und sich manchmal wie verrückt freuen kann.', 'Anna Seghers'),
('Frauen werden nicht frei sein, solange ihre Unterwerfung als sexy gilt.', 'Sheila Jeffreys'),
('Frauenrecht ist nicht nur ein abstrakter Begriff; es ist vor allem eine persönliche Sache.', 'Toni Morrison'),
('Niemand soll die Falten auf meiner Stirn wegzaubern, die ich durch die Verwunderung angesichts der Schönheit des Lebens bekommen habe.', 'Meryl Streep'),
('Es ist sehr wichtig, in Bewegung zu sein, ein Ziel zu haben, das zu tun, was wirklich von Bedeutung ist.', 'Marija Gimbutas'),
('Zu wissen, dass die Zeitgenossinnen meiner Großmutter nicht nur brave Ehefrauen, Mütter, Hausfrauen und Köchinnen waren, sondern vielmehr eine Generation potenzieller Freiheitskämpferinnen, gibt ihrem Dasein eine neue Dimension.', 'Midge Mackenzie'),
('Wüsstest du auch nur um die Hälfte der außergewöhnlichen unbesonnenen Dinge, die ich tue, du würdest gewiss dem Gedanken zuneigen, dass irgendein Zauber auf mir liegt.', 'Ada Lovelace');