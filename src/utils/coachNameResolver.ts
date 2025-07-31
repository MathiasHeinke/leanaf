/**
 * Zentrale Funktion für die Namensauflösung für Coaches
 * 
 * Priorität:
 * 1. preferred_name (Spitzname) - wenn gesetzt
 * 2. first_name (Vorname) - wenn gesetzt
 * 3. Fallback: Höfliche/offene Anrede ohne "Du"
 */

interface UserProfile {
  preferred_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null; // Legacy support
  email?: string | null;
}

/**
 * Löst den Namen für Coach-Anreden auf
 * @param profile - Benutzer-Profil Daten
 * @returns Name für Coach-Anrede
 */
export function resolveCoachName(profile: UserProfile | null | undefined): string {
  // Handle null oder undefined profile
  if (!profile) {
    return 'mein Schützling';
  }

  // 1. Priorität: Spitzname/preferred_name
  if (profile.preferred_name?.trim()) {
    return profile.preferred_name.trim();
  }

  // 2. Priorität: Vorname
  if (profile.first_name?.trim()) {
    return profile.first_name.trim();
  }

  // 3. Legacy: display_name (nur Vorname extrahieren)
  if (profile.display_name?.trim()) {
    const firstName = profile.display_name.trim().split(' ')[0];
    if (firstName && firstName.length > 1) {
      return firstName;
    }
  }

  // 4. Email-basiert (nur als letzter Ausweg)
  if (profile.email?.includes('@')) {
    const emailName = profile.email.split('@')[0];
    if (emailName && emailName.length > 2 && !emailName.includes('_') && !emailName.includes('.')) {
      return emailName;
    }
  }

  // 5. Fallback: Höfliche, offene Anrede (NICHT "Du")
  return 'mein Schützling';
}

/**
 * Löst den Namen für Coach-Anreden auf (nur Vorname wenn es ein zusammengesetzter Name ist)
 * @param profile - Benutzer-Profil Daten
 * @returns Erster Name für Coach-Anrede
 */
export function resolveCoachFirstName(profile: UserProfile | null | undefined): string {
  const fullName = resolveCoachName(profile);
  
  // Extrahiere nur den ersten Namen falls es ein zusammengesetzter Name ist
  if (fullName && fullName !== 'mein Schützling') {
    return fullName.split(' ')[0];
  }
  
  return fullName;
}

/**
 * Überprüft ob ein Name gesetzt ist (nicht Fallback)
 * @param profile - Benutzer-Profil Daten
 * @returns true wenn ein echter Name verfügbar ist
 */
export function hasRealName(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  
  return !!(
    profile.preferred_name?.trim() || 
    profile.first_name?.trim() || 
    (profile.display_name?.trim() && profile.display_name.trim().length > 1)
  );
}