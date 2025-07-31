export function getDisplayName(profile: any): string {
  // Handle null or undefined profile
  if (!profile) {
    return 'Athlet';
  }
  
  return (
    profile.preferred_name ||     // 🟢 Feld „Wie sollen die Coaches dich nennen?" (Nickname)
    profile.first_name      ||    // 🟡 Fallback auf Vorname
    profile.display_name    ||    // 🟡 Legacy fallback
    profile.nickname        ||    // 🟡 Alternative nickname field
    profile.full_name       ||    // 🟡 Full name fallback
    profile.email?.split('@')[0] ||
    'Athlet'
  );
}