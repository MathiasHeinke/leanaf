/**
 * Zentrale Funktion für die Namensauflösung für Coaches (Edge Function Version)
 * 
 * Priorität:
 * 1. preferred_name (Spitzname) - wenn gesetzt
 * 2. first_name (Vorname) - wenn gesetzt
 * 3. Fallback: Höfliche/offene Anrede ohne "Du"
 */
export function getDisplayName(profile: any): string {
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