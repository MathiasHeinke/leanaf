/**
 * KONSOLIDIERTE Name-Resolution - IDENTISCH zu Backend getDisplayName()
 * 
 * Priorität:
 * 1. preferred_name (Spitzname) - wenn gesetzt
 * 2. first_name (Vorname) - wenn gesetzt
 * 3. last_name (als Fallback) - nur einzelne Wörter
 * 4. display_name (Legacy) - mit Hyphen-Support
 * 5. email-basiert (letzter Ausweg)
 * 6. Fallback: 'mein Schützling'
 */

interface UserProfile {
  preferred_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  email?: string | null;
}

/**
 * MASTER Name-Resolution Funktion (identisch zu Backend)
 * @param profile - Benutzer-Profil Daten
 * @returns Name für Coach-Anrede
 */
export function getDisplayName(profile: UserProfile | null | undefined): string {
  // Handle null oder undefined profile
  if (!profile) {
    return 'mein Schützling';
  }

  // 1. Priorität: Spitzname/preferred_name
  if (profile.preferred_name?.trim()) {
    return profile.preferred_name.trim();
  }

  // 2. Priorität: Vorname (first_name)
  if (profile.first_name?.trim()) {
    return profile.first_name.trim();
  }

  // 2b. Fallback: last_name als Vorname (selten, aber möglich)
  if (profile.last_name?.trim()) {
    const lastName = profile.last_name.trim();
    // Nur wenn es ein einzelnes Wort ist und nicht offensichtlich ein Nachname
    if (!lastName.includes(' ') && lastName.length > 1) {
      return lastName;
    }
  }

  // 3. Legacy: display_name (nur ersten Namen, aber mit Hyphen-Support)
  if (profile.display_name?.trim()) {
    const displayName = profile.display_name.trim();
    // Bei Doppelnamen/Hyphens: ersten logischen Namen extrahieren
    const firstName = displayName.includes('-') 
      ? displayName.match(/^([^\s]+)/)?.[0] || displayName.split(' ')[0]
      : displayName.split(' ')[0];
    if (firstName && firstName.length > 1) {
      return firstName;
    }
  }

  // 4. Email-basiert (nur als letzter Ausweg)
  if (profile.email?.includes('@')) {
    const emailName = profile.email.split('@')[0];
    const blacklist = ['info','office','mail','admin','contact','support','hello'];
    if (emailName.length > 2 && !emailName.includes('_') && !emailName.includes('.') && !blacklist.includes(emailName.toLowerCase())) {
      return emailName;
    }
  }

  // 5. Fallback: Höfliche, offene Anrede (NICHT "Du")
  return 'mein Schützling';
}

// Exports - kein Drift mehr möglich
export { getDisplayName as resolveCoachName, getDisplayName as resolveCoachFirstName };

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
    profile.last_name?.trim() ||
    (profile.display_name?.trim() && profile.display_name.trim().length > 1)
  );
}