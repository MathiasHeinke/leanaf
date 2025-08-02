// Test file for user profile extraction
import { describe, it, expect } from 'vitest';
import { extractUserProfile, extractUserProfileEnhanced, getExtractionDebugInfo } from '../extractUserProfile';

describe('User Profile Extraction', () => {
  const mockMessages = [
    { role: 'user', content: 'Ich trainiere seit 5 Jahren und habe Rückenprobleme' },
    { role: 'assistant', content: 'Das verstehe ich...' },
    { role: 'user', content: 'Ich habe nur 45 Minuten Zeit und mache 3 Tage die Woche Sport' }
  ];

  it('extracts experience years correctly', () => {
    const profile = extractUserProfile(mockMessages);
    expect(profile.experienceYears).toBe(5);
  });

  it('detects injuries from text', () => {
    const profile = extractUserProfile(mockMessages);
    expect(profile.injuries).toContain('ruecken');
  });

  it('extracts time constraints', () => {
    const profile = extractUserProfile(mockMessages);
    expect(profile.availableMinutes).toBe(45);
  });

  it('detects weekly sessions', () => {
    const profile = extractUserProfile(mockMessages);
    expect(profile.weeklySessions).toBe(3);
  });

  it('identifies pump preference', () => {
    const messages = [
      { role: 'user', content: 'Ich liebe den Pump beim Training' }
    ];
    const profile = extractUserProfile(messages);
    expect(profile.preferences?.pumpStyle).toBe(true);
  });

  it('detects strength focus', () => {
    const messages = [
      { role: 'user', content: 'Ich will maximale Kraft aufbauen und heavy liften' }
    ];
    const profile = extractUserProfile(messages);
    expect(profile.preferences?.strengthFocus).toBe(true);
  });

  it('identifies cardio preference', () => {
    const messages = [
      { role: 'user', content: 'Ich mache gerne Cardio und Ausdauersport' }
    ];
    const profile = extractUserProfile(messages);
    expect(profile.preferences?.cardio).toBe(true);
  });

  it('detects multiple injury types', () => {
    const messages = [
      { role: 'user', content: 'Ich habe Probleme mit Knie und Schulter' }
    ];
    const profile = extractUserProfile(messages);
    expect(profile.injuries).toContain('knie');
    expect(profile.injuries).toContain('schulter');
  });

  it('handles enhanced extraction with existing profile', () => {
    const existingProfile = { experienceYears: 3 };
    const messages = [
      { role: 'user', content: 'Ich habe nur 30 Minuten Zeit' }
    ];
    
    const enhanced = extractUserProfileEnhanced(messages, existingProfile);
    expect(enhanced.experienceYears).toBe(3); // from existing
    expect(enhanced.availableMinutes).toBe(30); // from new data
  });

  it('provides debug information', () => {
    const { profile, matches } = getExtractionDebugInfo(mockMessages);
    
    expect(profile.experienceYears).toBe(5);
    expect(matches.years).toBeDefined();
    expect(matches.minutes).toBeDefined();
    expect(matches.sessions).toBeDefined();
  });

  it('detects goal preferences', () => {
    const messages = [
      { role: 'user', content: 'Ich will Muskeln aufbauen und Masse gewinnen' }
    ];
    const profile = extractUserProfile(messages);
    expect(profile.goal).toBe('hypertrophy');
  });

  it('maps time with different units correctly', () => {
    const hourMessages = [
      { role: 'user', content: 'Ich habe nur 1 Stunde Zeit' }
    ];
    const profile = extractUserProfile(hourMessages);
    expect(profile.availableMinutes).toBe(60);
  });

  it('handles constraint language', () => {
    const messages = [
      { role: 'user', content: 'Ich kann maximal 30 Minuten trainieren' }
    ];
    const profile = extractUserProfile(messages);
    expect(profile.availableMinutes).toBe(30);
  });

  it('detects advanced preferences', () => {
    const messages = [
      { role: 'user', content: 'Ich mag wissenschaftliche Periodisierung und evidenzbasierte Methoden' }
    ];
    const profile = extractUserProfile(messages);
    expect(profile.preferences?.periodization).toBe(true);
  });
});