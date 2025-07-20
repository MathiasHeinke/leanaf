import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'de' | 'en';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const translations = {
  de: {
    // App general
    'app.title': 'KaloAI',
    'app.letsGetLean': 'Dein persönlicher Ernährungscoach',
    'app.dailyProgress': 'Täglicher Fortschritt',
    
    // Common terms
    'common.select': 'Auswählen',
    'common.save': 'Speichern',
    'common.error': 'Fehler',
    'common.loading': 'Laden...',
    'common.back': 'Zurück',
    'common.today': 'Heute',
    
    // UI elements
    'ui.kcal': 'kcal',
    'ui.goal': 'Ziel',
    'ui.over': 'über',
    'ui.gram': 'g',
    
    // Progress indicators
    'progress.remaining': 'verbleibend',
    'progress.overGoal': 'über dem Ziel',
    'progress.stillNeed': 'noch benötigt',
    'progress.goalReached': 'Ziel erreicht',
    'progress.over': 'über',
    'progress.exceeded': 'überschritten',
    
    // Date
    'date.today': 'Heute',
    
    // Input placeholders
    'input.placeholder': 'Beschreibe deine Mahlzeit...',
    'weightInput.placeholder': 'Gewicht in kg',
    
    // NotFound page
    'notFound.title': 'Seite nicht gefunden',
    'notFound.subtitle': 'Die angeforderte Seite existiert nicht.',
    'notFound.returnHome': 'Zurück zur Startseite',
    
    // Subscription
    'subscription.title': 'Abonnement',
    'subscription.currentPlan': 'Aktueller Plan',
    'subscription.premium': 'Premium',
    'subscription.free': 'Kostenlos',
    'subscription.manage': 'Verwalten',
    'subscription.upgrade': 'Upgraden',
    'subscription.processing': 'Verarbeitung...',
    'subscription.monthlyPrice': '9,99€/Monat',
    'subscription.features': 'Features',
    'subscription.feature1': 'Unbegrenzte Mahlzeitenerkennung',
    'subscription.feature2': 'Persönlicher KI-Coach',
    'subscription.feature3': 'Detaillierte Analysen',
    'subscription.feature4': 'Keine Werbung',
    
    // Settings
    'settings.title': 'Einstellungen',
    'settings.close': 'Schließen',
    'settings.dailyCalorieGoal': 'Tägliches Kalorienziel',
    'settings.recommended': 'Empfohlen: 2000-2500 kcal für durchschnittliche Erwachsene',
    'settings.invalidGoal': 'Ungültiges Ziel',
    'settings.goalRange': 'Bitte gib ein Kalorienziel zwischen 800 und 5000 ein.',
    'settings.goalSaved': 'Ziel gespeichert',
    'settings.newDailyGoal': 'Neues tägliches Kalorienziel: {calories} kcal',
    'settings.saveError': 'Fehler beim Speichern des Ziels',
    'settings.saveGoal': 'Ziel speichern',
    'settings.darkMode': 'Automatischer Dunkelmodus',
    'settings.darkModeDesc': 'Aktiviere automatischen Dunkelmodus basierend auf der Tageszeit',
    'settings.activeTime': 'Aktiv von',
    'settings.toggleTheme': 'Thema wechseln',
    'settings.autoActive': 'Automatisch aktiv',
    
    // Profile
    'profile.loading': 'Lade Profil...',
    'profile.personalData': 'Persönliche Daten',
    'profile.startWeight': 'Startgewicht (kg)',
    'profile.currentWeightLabel': 'Aktuelles Gewicht',
    'profile.height': 'Größe (cm)',
    'profile.age': 'Alter',
    'profile.gender': 'Geschlecht',
    'profile.gender.male': 'Männlich',
    'profile.gender.female': 'Weiblich',
    'profile.activityLevel': 'Aktivitätslevel',
    'profile.activityLevels.sedentary': 'Inaktiv - Bürojob, wenig Bewegung (<2h/Woche)',
    'profile.activityLevels.light': 'Leicht aktiv - Bürojob + gelegentlicher Sport (2-3h/Woche)',
    'profile.activityLevels.moderate': 'Mäßig aktiv - 3-4x Sport/Woche ODER aktiver Job',
    'profile.activityLevels.active': 'Sehr aktiv - 4-5x Training/Woche ODER körperlicher Job',
    'profile.activityLevels.very_active': 'Extrem aktiv - 6-7x Training + körperlicher Job',
    'profile.activityLevelHelp': 'Wähle basierend auf deiner gesamten wöchentlichen Aktivität (Beruf + Sport)',
    'profile.activityExamples.sedentary': 'Beispiele: Bürojob ohne Sport, hauptsächlich sitzende Tätigkeiten',
    'profile.activityExamples.light': 'Beispiele: Bürojob + 1-2x pro Woche Sport oder längere Spaziergänge',
    'profile.activityExamples.moderate': 'Beispiele: Bürojob + 3-4x Sport pro Woche ODER körperlich aktiver Job (Verkäufer, Lehrer)',
    'profile.activityExamples.active': 'Beispiele: Regelmäßiges Training 4-5x pro Woche ODER körperlich anspruchsvoller Job',
    'profile.activityExamples.very_active': 'Beispiele: Intensives Training fast täglich ODER sehr körperlicher Job + zusätzlicher Sport',
    'profile.defineGoals': 'Ziele festlegen',
    'profile.goal': 'Ziel',
    'profile.goals.lose': 'Abnehmen',
    'profile.goals.maintain': 'Gewicht halten',
    'profile.goals.gain': 'Zunehmen',
    'profile.targetWeight': 'Zielgewicht (kg)',
    'profile.targetDate': 'Zieldatum',
    'profile.calorieDeficit': 'Kaloriendefizit (kcal)',
    'profile.calorieAdjustment': 'Passe dein Kaloriendefizit an, um dein Ziel zu erreichen',
    'profile.muscleMaintenancePriority': 'Muskelmasse erhalten',
    'profile.coachSettings': 'Coach Einstellungen',
    'profile.coachPersonality': 'Coach Persönlichkeit',
    'profile.coachPersonalities.hart': 'Hart',
    'profile.coachPersonalities.soft': 'Sanft',
    'profile.coachPersonalities.motivierend': 'Motivierend',
    'coach.preview': 'Vorschau',
    'coach.preview.tough': 'Direkt und fordernd, motiviert dich zum Durchhalten.',
    'coach.preview.soft': 'Einfühlsam und unterstützend, hilft dir sanft auf deinem Weg.',
    'coach.preview.motivating': 'Positiv und anspornend, hält deine Motivation hoch.',
    'profile.macroStrategies': 'Makro-Strategien',
    'profile.macroStrategy.standard': 'Standard',
    'profile.macroStrategy.high_protein': 'Hoher Proteinanteil',
    'profile.macroStrategy.balanced': 'Ausgewogen',
    'profile.macroStrategy.low_carb': 'Low Carb',
    'profile.macroStrategy.athletic': 'Athletisch',
    'profile.macroStrategyDesc.standard': '30% Protein, 40% Kohlenhydrate, 30% Fette',
    'profile.macroStrategyDesc.high_protein': '40% Protein, 30% Kohlenhydrate, 30% Fette',
    'profile.macroStrategyDesc.balanced': '25% Protein, 45% Kohlenhydrate, 30% Fette',
    'profile.macroStrategyDesc.low_carb': '35% Protein, 20% Kohlenhydrate, 45% Fette',
    'profile.macroStrategyDesc.athletic': '30% Protein, 50% Kohlenhydrate, 20% Fette',
    'macros.protein': 'Protein',
    'macros.carbs': 'Kohlenhydrate',
    'macros.fats': 'Fette',
    'profile.totalPercentage': 'Gesamt: {total}%',
    'profile.yourMacros': 'Deine Makros',
    'profile.calorieCalculation': 'Kalorienberechnung',
    'profile.bmr': 'Grundumsatz (BMR)',
    'profile.tdee': 'Gesamtumsatz (TDEE)',
    'profile.weightGoalAnalysisTitle': 'Gewichtsziel Analyse',
    'profile.weightDifference': 'Gewichtsdifferenz',
    'profile.timeToGoal': 'Zeit bis zum Ziel',
    'profile.weeks': 'Wochen',
    'profile.requiredProgress': 'Erforderlicher Fortschritt',
    'profile.kgPerWeek': 'kg pro Woche',
    'profile.requiredCalorieDeficit': 'Erforderliches Kaloriendefizit',
    'profile.daily': 'Täglich',
    'profile.weekly': 'Wöchentlich',
    'profile.ambitiousGoalWarning': '⚠️ Dein Ziel ist sehr ambitioniert. Bitte achte auf eine gesunde Gewichtsabnahme/-zunahme.',
    'profile.calculationNote': 'Hinweis: Die Berechnungen sind Schätzungen und können individuell variieren.',
    'profile.autoSaving': 'Automatisches Speichern...',
    'profile.saveStatus': 'Zuletzt gespeichert um {time}',
    'profile.notSaved': 'Nicht gespeichert',
    'toast.success.profileSaved': 'Profil erfolgreich gespeichert!',
    'toast.error.savingProfile': 'Fehler beim Speichern des Profils',
  },
  en: {
    // App general
    'app.title': 'KaloAI',
    'app.letsGetLean': 'Your personal nutrition coach',
    'app.dailyProgress': 'Daily Progress',
    
    // Common terms
    'common.select': 'Select',
    'common.save': 'Save',
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.back': 'Back',
    'common.today': 'Today',
    
    // UI elements
    'ui.kcal': 'kcal',
    'ui.goal': 'Goal',
    'ui.over': 'over',
    'ui.gram': 'g',
    
    // Progress indicators
    'progress.remaining': 'remaining',
    'progress.overGoal': 'over goal',
    'progress.stillNeed': 'still need',
    'progress.goalReached': 'goal reached',
    'progress.over': 'over',
    'progress.exceeded': 'exceeded',
    
    // Date
    'date.today': 'Today',
    
    // Input placeholders
    'input.placeholder': 'Describe your meal...',
    'weightInput.placeholder': 'Weight in kg',
    
    // NotFound page
    'notFound.title': 'Page Not Found',
    'notFound.subtitle': 'The requested page does not exist.',
    'notFound.returnHome': 'Return to Home',
    
    // Subscription
    'subscription.title': 'Subscription',
    'subscription.currentPlan': 'Current Plan',
    'subscription.premium': 'Premium',
    'subscription.free': 'Free',
    'subscription.manage': 'Manage',
    'subscription.upgrade': 'Upgrade',
    'subscription.processing': 'Processing...',
    'subscription.monthlyPrice': '$9.99/month',
    'subscription.features': 'Features',
    'subscription.feature1': 'Unlimited meal recognition',
    'subscription.feature2': 'Personal AI coach',
    'subscription.feature3': 'Detailed analytics',
    'subscription.feature4': 'No ads',
    
    // Settings
    'settings.title': 'Settings',
    'settings.close': 'Close',
    'settings.dailyCalorieGoal': 'Daily Calorie Goal',
    'settings.recommended': 'Recommended: 2000-2500 kcal for average adults',
    'settings.invalidGoal': 'Invalid Goal',
    'settings.goalRange': 'Please enter a calorie goal between 800 and 5000.',
    'settings.goalSaved': 'Goal Saved',
    'settings.newDailyGoal': 'New daily calorie goal: {calories} kcal',
    'settings.saveError': 'Error saving goal',
    'settings.saveGoal': 'Save Goal',
    'settings.darkMode': 'Auto Dark Mode',
    'settings.darkModeDesc': 'Enable automatic dark mode based on time of day',
    'settings.activeTime': 'Active from',
    'settings.toggleTheme': 'Toggle Theme',
    'settings.autoActive': 'Automatically active',
    
    // Profile
    'profile.loading': 'Loading profile...',
    'profile.personalData': 'Personal Data',
    'profile.startWeight': 'Start Weight (kg)',
    'profile.currentWeightLabel': 'Current Weight',
    'profile.height': 'Height (cm)',
    'profile.age': 'Age',
    'profile.gender': 'Gender',
    'profile.gender.male': 'Male',
    'profile.gender.female': 'Female',
    'profile.activityLevel': 'Activity Level',
    'profile.activityLevels.sedentary': 'Inactive - Desk job, little movement (<2h/week)',
    'profile.activityLevels.light': 'Lightly active - Desk job + occasional sport (2-3h/week)',
    'profile.activityLevels.moderate': 'Moderately active - 3-4x sport/week OR active job',
    'profile.activityLevels.active': 'Very active - 4-5x training/week OR physical job',
    'profile.activityLevels.very_active': 'Extremely active - 6-7x training + physical job',
    'profile.activityLevelHelp': 'Choose based on your total weekly activity (work + sport)',
    'profile.activityExamples.sedentary': 'Examples: Desk job without sport, mainly sedentary activities',
    'profile.activityExamples.light': 'Examples: Desk job + 1-2x per week sport or long walks',
    'profile.activityExamples.moderate': 'Examples: Desk job + 3-4x sport per week OR physically active job (sales, teacher)',
    'profile.activityExamples.active': 'Examples: Regular training 4-5x per week OR physically demanding job',
    'profile.activityExamples.very_active': 'Examples: Intensive training almost daily OR very physical job + additional sport',
    'profile.defineGoals': 'Define Goals',
    'profile.goal': 'Goal',
    'profile.goals.lose': 'Lose',
    'profile.goals.maintain': 'Maintain',
    'profile.goals.gain': 'Gain',
    'profile.targetWeight': 'Target Weight (kg)',
    'profile.targetDate': 'Target Date',
    'profile.calorieDeficit': 'Calorie Deficit (kcal)',
    'profile.calorieAdjustment': 'Adjust your calorie deficit to reach your goal',
    'profile.muscleMaintenancePriority': 'Muscle Maintenance Priority',
    'profile.coachSettings': 'Coach Settings',
    'profile.coachPersonality': 'Coach Personality',
    'profile.coachPersonalities.hart': 'Tough',
    'profile.coachPersonalities.soft': 'Soft',
    'profile.coachPersonalities.motivierend': 'Motivating',
    'coach.preview': 'Preview',
    'coach.preview.tough': 'Direct and demanding, motivates you to persevere.',
    'coach.preview.soft': 'Empathetic and supportive, gently helps you on your way.',
    'coach.preview.motivating': 'Positive and encouraging, keeps your motivation high.',
    'profile.macroStrategies': 'Macro Strategies',
    'profile.macroStrategy.standard': 'Standard',
    'profile.macroStrategy.high_protein': 'High Protein',
    'profile.macroStrategy.balanced': 'Balanced',
    'profile.macroStrategy.low_carb': 'Low Carb',
    'profile.macroStrategy.athletic': 'Athletic',
    'profile.macroStrategyDesc.standard': '30% protein, 40% carbs, 30% fats',
    'profile.macroStrategyDesc.high_protein': '40% protein, 30% carbs, 30% fats',
    'profile.macroStrategyDesc.balanced': '25% protein, 45% carbs, 30% fats',
    'profile.macroStrategyDesc.low_carb': '35% protein, 20% carbs, 45% fats',
    'profile.macroStrategyDesc.athletic': '30% protein, 50% carbs, 20% fats',
    'macros.protein': 'Protein',
    'macros.carbs': 'Carbs',
    'macros.fats': 'Fats',
    'profile.totalPercentage': 'Total: {total}%',
    'profile.yourMacros': 'Your Macros',
    'profile.calorieCalculation': 'Calorie Calculation',
    'profile.bmr': 'Basal Metabolic Rate (BMR)',
    'profile.tdee': 'Total Daily Energy Expenditure (TDEE)',
    'profile.weightGoalAnalysisTitle': 'Weight Goal Analysis',
    'profile.weightDifference': 'Weight Difference',
    'profile.timeToGoal': 'Time to Goal',
    'profile.weeks': 'weeks',
    'profile.requiredProgress': 'Required Progress',
    'profile.kgPerWeek': 'kg per week',
    'profile.requiredCalorieDeficit': 'Required Calorie Deficit',
    'profile.daily': 'Daily',
    'profile.weekly': 'Weekly',
    'profile.ambitiousGoalWarning': '⚠️ Your goal is very ambitious. Please ensure healthy weight loss/gain.',
    'profile.calculationNote': 'Note: Calculations are estimates and may vary individually.',
    'profile.autoSaving': 'Auto-saving...',
    'profile.saveStatus': 'Last saved at {time}',
    'profile.notSaved': 'Not saved',
    'toast.success.profileSaved': 'Profile saved successfully!',
    'toast.error.savingProfile': 'Error saving profile',
  }
};

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'de';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation missing for key: ${key} in language: ${language}`);
      return key;
    }

    // Replace parameters if provided
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      }, value);
    }
    
    return value;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
