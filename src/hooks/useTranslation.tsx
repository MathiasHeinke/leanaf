import { createContext, useContext, useState, useEffect } from 'react';

interface TranslationContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

const translations = {
  de: {
    // Navigation
    'nav.home': 'Startseite',
    'nav.history': 'Verlauf',
    'nav.settings': 'Einstellungen',
    'nav.profile': 'Profil',
    'nav.subscription': 'Abonnement',
    'nav.logout': 'Abmelden',
    
    // Main App
    'app.title': 'KaloTracker',
    'app.welcome': 'Willkommen bei KaloTracker',
    'app.dailyProgress': 'Täglicher Fortschritt',
    'app.calories': 'Kalorien',
    'app.protein': 'Protein',
    'app.carbs': 'Kohlenhydrate',
    'app.fats': 'Fette',
    'app.todaysMeals': 'Heutige Mahlzeiten',
    'app.noMeals': 'Noch keine Mahlzeiten heute hinzugefügt',
    'app.addMeal': 'Mahlzeit hinzufügen',
    'app.analyzing': 'Analysiere...',
    'app.mealAdded': 'Mahlzeit erfolgreich hinzugefügt!',
    'app.error': 'Fehler beim Hinzufügen der Mahlzeit',
    
    // Input modes
    'input.photo': 'Foto',
    'input.voice': 'Sprache',
    'input.text': 'Text',
    'input.placeholder': 'Beschreibe deine Mahlzeit...',
    'input.record': 'Aufnahme',
    'input.recording': 'Aufnahme läuft...',
    'input.photoUpload': 'Foto hochladen',
    'common.stop': 'Stop',
    
    // Authentication
    'auth.signIn': 'Anmelden',
    'auth.signUp': 'Registrieren',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.confirmPassword': 'Passwort bestätigen',
    'auth.forgotPassword': 'Passwort vergessen?',
    'auth.noAccount': 'Noch kein Konto?',
    'auth.haveAccount': 'Bereits ein Konto?',
    'auth.signInHere': 'Hier anmelden',
    'auth.signUpHere': 'Hier registrieren',
    'auth.loading': 'Lädt...',
    'auth.error': 'Fehler bei der Anmeldung',
    'auth.passwordsNoMatch': 'Passwörter stimmen nicht überein',
    'auth.emailInvalid': 'Ungültige E-Mail-Adresse',
    'auth.passwordTooShort': 'Passwort muss mindestens 6 Zeichen lang sein',
    
    // Profile
    'profile.title': 'Profil',
    'profile.displayName': 'Anzeigename',
    'profile.email': 'E-Mail',
    'profile.language': 'Sprache',
    'profile.personalInfo': 'Persönliche Informationen',
    'profile.weight': 'Gewicht (kg)',
    'profile.height': 'Größe (cm)',
    'profile.age': 'Alter',
    'profile.gender': 'Geschlecht',
    'profile.gender.male': 'Männlich',
    'profile.gender.female': 'Weiblich',
    'profile.gender.other': 'Divers',
    'profile.activityLevel': 'Aktivitätslevel',
    'profile.activity.sedentary': 'Sitzend',
    'profile.activity.light': 'Leicht aktiv',
    'profile.activity.moderate': 'Moderat aktiv',
    'profile.activity.active': 'Aktiv',
    'profile.activity.very_active': 'Sehr aktiv',
    'profile.goal': 'Ziel',
    'profile.goal.lose': 'Abnehmen',
    'profile.goal.maintain': 'Halten',
    'profile.goal.gain': 'Zunehmen',
    'profile.weightHistory': 'Gewichtsverlauf',
    'profile.addWeight': 'Gewicht hinzufügen',
    'profile.currentWeight': 'Aktuelles Gewicht',
    'profile.save': 'Speichern',
    'profile.saved': 'Profil gespeichert!',
    'profile.error': 'Fehler beim Speichern des Profils',
    
    // Subscription
    'subscription.title': 'Abonnement',
    'subscription.currentPlan': 'Aktueller Plan',
    'subscription.free': 'Kostenlos',
    'subscription.premium': 'Premium',
    'subscription.upgrade': 'Upgrade auf Premium',
    'subscription.manage': 'Abonnement verwalten',
    'subscription.features': 'Premium-Funktionen',
    'subscription.feature1': 'Unbegrenzte Mahlzeiten-Analysen',
    'subscription.feature2': 'Erweiterte Coaching-Tipps',
    'subscription.feature3': 'Detaillierte Nährwert-Berichte',
    'subscription.feature4': 'Prioritäts-Support',
    'subscription.monthlyPrice': '€9,99/Monat',
    'subscription.processing': 'Verarbeite...',
    
    // Coach
    'coach.title': 'Dein Ernährungs-Coach',
    'coach.analysisTitle': 'Tägliche Analyse',
    'coach.updateAnalysis': 'Analyse aktualisieren',
    'coach.loading': 'Analysiere deine Ernährung...',
    'coach.score': 'Tagesbewertung',
    'coach.summary': 'Zusammenfassung',
    'coach.tips': 'Tipps',
    'coach.motivation': 'Motivation',
    'coach.warning': 'Warnung',
    
    // Settings
    'settings.title': 'Einstellungen',
    'settings.dailyGoals': 'Tägliche Ziele',
    'settings.language': 'Sprache',
    'settings.german': 'Deutsch',
    'settings.english': 'Englisch',
    'settings.save': 'Speichern',
    'settings.saved': 'Einstellungen gespeichert!',
    
    // History
    'history.title': 'Verlauf',
    'history.noHistory': 'Kein Verlauf vorhanden',
    'history.date': 'Datum',
    'history.meals': 'Mahlzeiten',
    'history.total': 'Gesamt',
    
    // Common
    'common.back': 'Zurück',
    'common.close': 'Schließen',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.loading': 'Lädt...',
    'common.error': 'Fehler',
    'common.success': 'Erfolgreich',
    'common.yes': 'Ja',
    'common.no': 'Nein',
    
    // Specific UI elements
    'ui.remaining': 'verbleibend',
    'ui.overGoal': 'über dem Ziel',
    'ui.bmr': 'Grundumsatz',
    'ui.tdee': 'Gesamtumsatz',
    'ui.ketoCoach': 'Keto Coach',
    'ui.kcal': 'kcal',
    'ui.gram': 'g',
    'ui.overBy': 'über',
    'ui.goal': 'Ziel',
    'ui.until': 'bis',
    
    // Motivational messages
    'motivation.start': 'Perfekter Start! 🌟 Du bist auf dem richtigen Weg!',
    'motivation.half': 'Großartig! 💪 Die Hälfte ist geschafft!',
    'motivation.progress': 'Super Disziplin! 🎯 Bleib dran, du schaffst das!',
    'motivation.almost': 'Fast geschafft! 🏆 Nur noch ein kleiner Schritt!',
    'motivation.perfect': 'Perfekt! 🎉 Ziel erreicht - du bist fantastisch!',
    'motivation.over': 'Nicht schlimm! 😊 Morgen ist ein neuer Tag!',
    'motivation.discipline': 'Super Disziplin! 🎯 Bleib dran, du schaffst das!',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.history': 'History',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.subscription': 'Subscription',
    'nav.logout': 'Logout',
    
    // Main App
    'app.title': 'KaloTracker',
    'app.welcome': 'Welcome to KaloTracker',
    'app.dailyProgress': 'Daily Progress',
    'app.calories': 'Calories',
    'app.protein': 'Protein',
    'app.carbs': 'Carbs',
    'app.fats': 'Fats',
    'app.todaysMeals': 'Today\'s Meals',
    'app.noMeals': 'No meals added today',
    'app.addMeal': 'Add Meal',
    'app.analyzing': 'Analyzing...',
    'app.mealAdded': 'Meal added successfully!',
    'app.error': 'Error adding meal',
    
    // Input modes
    'input.photo': 'Photo',
    'input.voice': 'Voice',
    'input.text': 'Text',
    'input.placeholder': 'Describe your meal...',
    'input.record': 'Record',
    'input.recording': 'Recording...',
    'input.photoUpload': 'Upload Photo',
    'common.stop': 'Stop',
    
    // Authentication
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.haveAccount': 'Already have an account?',
    'auth.signInHere': 'Sign in here',
    'auth.signUpHere': 'Sign up here',
    'auth.loading': 'Loading...',
    'auth.error': 'Authentication error',
    'auth.passwordsNoMatch': 'Passwords do not match',
    'auth.emailInvalid': 'Invalid email address',
    'auth.passwordTooShort': 'Password must be at least 6 characters',
    
    // Profile
    'profile.title': 'Profile',
    'profile.displayName': 'Display Name',
    'profile.email': 'Email',
    'profile.language': 'Language',
    'profile.personalInfo': 'Personal Information',
    'profile.weight': 'Weight (kg)',
    'profile.height': 'Height (cm)',
    'profile.age': 'Age',
    'profile.gender': 'Gender',
    'profile.gender.male': 'Male',
    'profile.gender.female': 'Female',
    'profile.gender.other': 'Other',
    'profile.activityLevel': 'Activity Level',
    'profile.activity.sedentary': 'Sedentary',
    'profile.activity.light': 'Lightly Active',
    'profile.activity.moderate': 'Moderately Active',
    'profile.activity.active': 'Active',
    'profile.activity.very_active': 'Very Active',
    'profile.goal': 'Goal',
    'profile.goal.lose': 'Lose Weight',
    'profile.goal.maintain': 'Maintain Weight',
    'profile.goal.gain': 'Gain Weight',
    'profile.weightHistory': 'Weight History',
    'profile.addWeight': 'Add Weight',
    'profile.currentWeight': 'Current Weight',
    'profile.save': 'Save',
    'profile.saved': 'Profile saved!',
    'profile.error': 'Error saving profile',
    
    // Subscription
    'subscription.title': 'Subscription',
    'subscription.currentPlan': 'Current Plan',
    'subscription.free': 'Free',
    'subscription.premium': 'Premium',
    'subscription.upgrade': 'Upgrade to Premium',
    'subscription.manage': 'Manage Subscription',
    'subscription.features': 'Premium Features',
    'subscription.feature1': 'Unlimited meal analysis',
    'subscription.feature2': 'Advanced coaching tips',
    'subscription.feature3': 'Detailed nutrition reports',
    'subscription.feature4': 'Priority support',
    'subscription.monthlyPrice': '$9.99/month',
    'subscription.processing': 'Processing...',
    
    // Coach
    'coach.title': 'Your Nutrition Coach',
    'coach.analysisTitle': 'Daily Analysis',
    'coach.updateAnalysis': 'Update Analysis',
    'coach.loading': 'Analyzing your nutrition...',
    'coach.score': 'Daily Score',
    'coach.summary': 'Summary',
    'coach.tips': 'Tips',
    'coach.motivation': 'Motivation',
    'coach.warning': 'Warning',
    
    // Settings
    'settings.title': 'Settings',
    'settings.dailyGoals': 'Daily Goals',
    'settings.language': 'Language',
    'settings.german': 'German',
    'settings.english': 'English',
    'settings.save': 'Save',
    'settings.saved': 'Settings saved!',
    
    // History
    'history.title': 'History',
    'history.noHistory': 'No history available',
    'history.date': 'Date',
    'history.meals': 'Meals',
    'history.total': 'Total',
    
    // Common
    'common.back': 'Back',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Specific UI elements
    'ui.remaining': 'remaining',
    'ui.overGoal': 'over goal',
    'ui.bmr': 'BMR',
    'ui.tdee': 'TDEE',
    'ui.ketoCoach': 'Keto Coach',
    'ui.kcal': 'kcal',
    'ui.gram': 'g',
    'ui.overBy': 'over',
    'ui.goal': 'Goal',
    'ui.until': 'until',
    
    // Motivational messages
    'motivation.start': 'Perfect start! 🌟 You\'re on the right track!',
    'motivation.half': 'Great! 💪 Halfway there!',
    'motivation.progress': 'Super discipline! 🎯 Keep it up, you got this!',
    'motivation.almost': 'Almost there! 🏆 Just one more step!',
    'motivation.perfect': 'Perfect! 🎉 Goal achieved - you\'re fantastic!',
    'motivation.over': 'No worries! 😊 Tomorrow is a new day!',
    'motivation.discipline': 'Super discipline! 🎯 Stay strong, you can do it!',
  },
};

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState('de');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'de' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language as keyof typeof translations]?.[key as keyof typeof translations.de] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};