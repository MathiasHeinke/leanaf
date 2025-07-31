export function getDisplayName(profile: any): string {
  // Handle null or undefined profile
  if (!profile) {
    return 'Athlet';
  }
  
  return (
    profile.preferred_name ||     // 🟢 Feld „Wie sollen die Coaches dich nennen?"
    profile.first_name      ||
    profile.nickname        ||
    profile.full_name       ||
    profile.email?.split('@')[0] ||
    'Athlet'
  );
}