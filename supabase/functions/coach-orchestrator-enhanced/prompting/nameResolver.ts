// Name Resolver: Ask once, cache persistently
export type Identity = { 
  userId: string; 
  name?: string | null; 
  askedAt?: string | null; 
};

export type NameResolverResult = {
  name: string | null;
  ask: boolean;
  askText?: string;
  setAskedAt?: boolean;
};

export async function resolveUserName(
  identity: Identity, 
  getProfileName: () => Promise<string | null>
): Promise<NameResolverResult> {
  // 1) Check profile/cached name first
  const profName = (identity.name ?? (await getProfileName()) ?? '').trim();
  if (profName) {
    return { name: profName, ask: false };
  }

  // 2) Already asked? Don't ask again
  if (identity.askedAt) {
    return { name: null, ask: false };
  }

  // 3) Ask once with friendly tone
  return { 
    name: null, 
    ask: true, 
    askText: "Wie soll ich dich ansprechen?", 
    setAskedAt: true 
  };
}

export async function persistNameAsked(
  supabase: any,
  userId: string,
  coachId: string = 'ares'
): Promise<void> {
  try {
    await supabase
      .from('coach_runtime_state')
      .upsert({
        user_id: userId,
        coach_id: coachId,
        state_key: 'name_resolver',
        state_value: { askedAt: new Date().toISOString() }
      });
  } catch (error) {
    console.warn('Failed to persist name asked state:', error);
  }
}

export async function loadNameState(
  supabase: any,
  userId: string,
  coachId: string = 'ares'
): Promise<{ askedAt?: string; name?: string } | null> {
  try {
    const { data } = await supabase
      .from('coach_runtime_state')
      .select('state_value')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .eq('state_key', 'name_resolver')
      .single();
    
    return data?.state_value || null;
  } catch {
    return null;
  }
}