// Dial Settings: Style, Length, Temperature per Dial Level
export type DialLevel = 1 | 2 | 3 | 4 | 5;

export type DialSettings = {
  archetype: "Kamerad" | "Schmied" | "Vater" | "Weiser" | "Kommandant" | "Hearthkeeper";
  temp: number;
  maxWords: number;
  style: string;
};

export function dialSettings(dial: DialLevel): DialSettings {
  switch (dial) {
    case 1:
      return { 
        archetype: "Kamerad", 
        temp: 0.6, 
        maxWords: 200,
        style: "locker, kumpelhaft, aber fachlich fundiert" 
      };
    case 2:
      return { 
        archetype: "Schmied", 
        temp: 0.7, 
        maxWords: 300,
        style: "pragmatisch, handwerklich, evidenzbasiert" 
      };
    case 3:
      return { 
        archetype: "Vater", 
        temp: 0.55, 
        maxWords: 400,
        style: "fuehrsorglich, unterstuetzend, tiefgehend" 
      };
    case 4:
      return { 
        archetype: "Kommandant", 
        temp: 0.4, 
        maxWords: 250,
        style: "direkt, befehlend, praezise" 
      };
    case 5:
      return { 
        archetype: "Kommandant", 
        temp: 0.35, 
        maxWords: 150,
        style: "knapp, militaerisch, auf den Punkt" 
      };
    default:
      return dialSettings(3); // Default to level 3
  }
}

// Map old dial system to new archetypes
export function mapLegacyDial(oldDial: number): DialLevel {
  if (oldDial <= 1) return 1;
  if (oldDial <= 2) return 2;
  if (oldDial <= 3) return 3;
  if (oldDial <= 4) return 4;
  return 5;
}

export function getDialDescription(dial: DialLevel): string {
  const settings = dialSettings(dial);
  return `Dial ${dial}: ${settings.archetype} (${settings.style}, ~${settings.maxWords} Wörter)`;
}