
# leanAF - get lean as fcuk

Eine gamifizierte Fitness-App mit AI-gestütztem Kalorien- und Makrotracking. Level up und erreiche deine Ziele!

## 🎯 Features

- **AI-gestütztes Tracking**: Intelligente Kalorien- und Makronährstoff-Verfolgung
- **Gamification**: Levelsystem und Belohnungen für mehr Motivation
- **Persönlicher Coach**: Wähle zwischen verschiedenen Coach-Persönlichkeiten
- **Meal Tracking**: Fotografiere deine Mahlzeiten für automatische Nährwertanalyse
- **Fortschrittsverfolgung**: Umfassende Statistiken und Verlaufsdaten
- **Responsive Design**: Optimiert für alle Geräte

## 🚀 Installation & Entwicklung

### Voraussetzungen
- Node.js (Version 18 oder höher)
- npm oder yarn

### Erste Schritte

1. **Repository klonen**
   ```bash
   git clone <YOUR_GIT_URL>
   cd leanAF
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

4. **App öffnen**
   Die App ist nun unter `http://localhost:8080` verfügbar.

## 🛠️ Technologie-Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Datenbank, Auth, Edge Functions)
- **AI**: OpenAI GPT für Meal-Analyse und Coach-Interaktionen
- **Deployment**: Vercel/Netlify ready

## 📁 Projektstruktur

```
src/
├── components/         # React Komponenten
├── hooks/             # Custom React Hooks
├── pages/             # Seiten-Komponenten
├── integrations/      # Supabase Integration
├── utils/             # Utility-Funktionen
└── lib/               # Bibliotheken und Konfiguration
```

## 🔧 Konfiguration

### Umgebungsvariablen
Erstelle eine `.env.local` Datei mit folgenden Variablen:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

`OPENAI_API_KEY` wird für die Edge Function `coach-orchestrator-enhanced` benötigt, damit ARES v2 mit OpenAI kommunizieren kann.
Setze das Secret auch in Supabase:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### Supabase Setup
1. Erstelle ein neues Supabase Projekt
2. Führe die Migrationen aus: `npm run db:migrate`
3. Konfiguriere die Edge Functions für AI-Features

## 🎨 Design System

Das Projekt verwendet ein konsistentes Design System basierend auf:
- Tailwind CSS für Styling
- shadcn/ui für UI-Komponenten
- Responsive Design Prinzipien
- Dark/Light Mode Support

## 📱 Features im Detail

### AI Coach System
- Verschiedene Coach-Persönlichkeiten (Hart, Liebevoll, Motivierend)
- Personalisierte Empfehlungen basierend auf Fortschritt
- Intelligente Meal-Analyse über Bildverarbeitung

### Gamification
- Erfahrungspunkte für verschiedene Aktivitäten
- Levelaufstieg und Belohnungen
- Badge-System für Achievements
- Streak-Verfolgung

### Meal Tracking
- Foto-basierte Meal-Erkennung
- Automatische Nährwertberechnung
- Makronährstoff-Tracking
- Meal-Historie und -Analysen

## 🚀 Deployment

### Automatisches Deployment
Das Projekt ist für automatisches Deployment konfiguriert:

```bash
npm run build
npm run preview
```

### Manuelle Deployment-Optionen
- **Vercel**: Einfach Repository verknüpfen
- **Netlify**: Drag & Drop des `dist` Ordners
- **Eigener Server**: Build-Dateien auf Server uploaden

## 📊 Monitoring & Analytics

- Performance-Monitoring über Web Vitals
- Error-Tracking und Logging
- User-Analytics für Feature-Nutzung
- A/B Testing für UI-Optimierungen

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add AmazingFeature'`)
4. Push den Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt ist unter der MIT Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.

## 🔗 Links

- [Demo](https://leanaf-demo.vercel.app)
- [Documentation](https://docs.leanaf.app)
- [Support](mailto:support@leanaf.app)

---

**Entwickelt mit ❤️ für die Fitness-Community**
