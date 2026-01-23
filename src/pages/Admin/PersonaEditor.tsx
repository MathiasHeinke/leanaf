/**
 * PersonaEditor - Admin Interface für Coach Personas
 * 
 * Phase 3 Implementation:
 * - Liste aller Personas
 * - Bearbeitung von Dials, Phrases, Example Responses
 * - Live-Speicherung in Supabase
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Shield, 
  Edit, 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw,
  Users,
  Loader2,
  AlertTriangle,
  ChevronRight,
  X
} from 'lucide-react';
import { DialSlider } from '@/components/admin/DialSlider';

// Types
interface PersonalityDials {
  energy: number;
  directness: number;
  humor: number;
  warmth: number;
  depth: number;
  challenge: number;
  opinion: number;
}

interface PersonaExampleResponse {
  context: string;
  response: string;
}

interface CoachPersona {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  dial_energy: number;
  dial_directness: number;
  dial_humor: number;
  dial_warmth: number;
  dial_depth: number;
  dial_challenge: number;
  dial_opinion: number;
  phrase_frequency: number;
  language_style: string | null;
  dialect: string | null;
  phrases: string[];
  example_responses: PersonaExampleResponse[];
  is_active: boolean;
  sort_order: number;
}

// Dial Labels für die UI
const DIAL_LABELS: Record<keyof PersonalityDials, string> = {
  energy: '⚡ Energie',
  directness: '🎯 Direktheit',
  humor: '😄 Humor',
  warmth: '❤️ Wärme',
  depth: '🔮 Tiefe',
  challenge: '💪 Challenge',
  opinion: '💬 Meinung'
};

export const PersonaEditor: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useSecureAdminAccess('admin_panel');
  
  const [personas, setPersonas] = useState<CoachPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<CoachPersona | null>(null);
  const [editedPersona, setEditedPersona] = useState<CoachPersona | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Neue Phrase/Example Response
  const [newPhrase, setNewPhrase] = useState('');
  const [newExample, setNewExample] = useState<PersonaExampleResponse>({ context: '', response: '' });

  // Load personas
  useEffect(() => {
    if (isAdmin) {
      loadPersonas();
    }
  }, [isAdmin]);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coach_personas')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      // Map DB data to local type with proper array handling
      const mapped: CoachPersona[] = (data || []).map((p: any) => ({
        ...p,
        phrases: Array.isArray(p.phrases) ? p.phrases : [],
        example_responses: Array.isArray(p.example_responses) ? p.example_responses : [],
      }));
      setPersonas(mapped);
    } catch (err) {
      console.error('Error loading personas:', err);
      toast.error('Fehler beim Laden der Personas');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPersona = (persona: CoachPersona) => {
    setSelectedPersona(persona);
    setEditedPersona({ ...persona });
    setIsEditDialogOpen(true);
  };

  const handleDialChange = (dialName: string, value: number) => {
    if (!editedPersona) return;
    setEditedPersona({
      ...editedPersona,
      [`dial_${dialName}`]: value
    });
  };

  const handlePhraseFrequencyChange = (value: number) => {
    if (!editedPersona) return;
    setEditedPersona({
      ...editedPersona,
      phrase_frequency: value
    });
  };

  const handleAddPhrase = () => {
    if (!editedPersona || !newPhrase.trim()) return;
    const phrases = editedPersona.phrases || [];
    setEditedPersona({
      ...editedPersona,
      phrases: [...phrases, newPhrase.trim()]
    });
    setNewPhrase('');
  };

  const handleRemovePhrase = (index: number) => {
    if (!editedPersona) return;
    const phrases = [...(editedPersona.phrases || [])];
    phrases.splice(index, 1);
    setEditedPersona({
      ...editedPersona,
      phrases
    });
  };

  const handleAddExample = () => {
    if (!editedPersona || !newExample.context.trim() || !newExample.response.trim()) return;
    const examples = editedPersona.example_responses || [];
    setEditedPersona({
      ...editedPersona,
      example_responses: [...examples, { ...newExample }]
    });
    setNewExample({ context: '', response: '' });
  };

  const handleRemoveExample = (index: number) => {
    if (!editedPersona) return;
    const examples = [...(editedPersona.example_responses || [])];
    examples.splice(index, 1);
    setEditedPersona({
      ...editedPersona,
      example_responses: examples
    });
  };

  const handleSavePersona = async () => {
    if (!editedPersona) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('coach_personas')
        .update({
          name: editedPersona.name,
          description: editedPersona.description,
          icon: editedPersona.icon,
          dial_energy: editedPersona.dial_energy,
          dial_directness: editedPersona.dial_directness,
          dial_humor: editedPersona.dial_humor,
          dial_warmth: editedPersona.dial_warmth,
          dial_depth: editedPersona.dial_depth,
          dial_challenge: editedPersona.dial_challenge,
          dial_opinion: editedPersona.dial_opinion,
          phrase_frequency: editedPersona.phrase_frequency,
          language_style: editedPersona.language_style,
          dialect: editedPersona.dialect,
          phrases: editedPersona.phrases,
          example_responses: editedPersona.example_responses as { context: string; response: string }[],
          is_active: editedPersona.is_active
        })
        .eq('id', editedPersona.id);
      
      if (error) throw error;
      
      toast.success('Persona erfolgreich gespeichert!');
      setIsEditDialogOpen(false);
      loadPersonas();
    } catch (err) {
      console.error('Error saving persona:', err);
      toast.error('Fehler beim Speichern der Persona');
    } finally {
      setSaving(false);
    }
  };

  // Admin Loading State
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground mb-4 animate-spin" />
            <CardTitle>Berechtigung wird überprüft...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Access Denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle>Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">Sie haben keine Berechtigung für diese Seite.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 py-6 md:px-8 lg:px-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Coach Personas Editor</h1>
              <p className="text-muted-foreground">Verwalte und passe die Coach-Persönlichkeiten an</p>
            </div>
          </div>
          <Button onClick={loadPersonas} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Personas Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {personas.map((persona) => (
              <Card 
                key={persona.id} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  !persona.is_active ? 'opacity-60' : ''
                }`}
                onClick={() => handleEditPersona(persona)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{persona.icon || '🤖'}</span>
                      <div>
                        <CardTitle className="text-lg">{persona.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {persona.description || 'Keine Beschreibung'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!persona.is_active && (
                        <Badge variant="secondary">Inaktiv</Badge>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mini Dial Preview */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">⚡ {persona.dial_energy}</Badge>
                    <Badge variant="outline">🎯 {persona.dial_directness}</Badge>
                    <Badge variant="outline">😄 {persona.dial_humor}</Badge>
                    <Badge variant="outline">❤️ {persona.dial_warmth}</Badge>
                    <Badge variant="outline">💪 {persona.dial_challenge}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Phrase Frequency: {persona.phrase_frequency}/10 • 
                    {persona.phrases?.length || 0} Floskeln • 
                    {persona.example_responses?.length || 0} Beispiele
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{editedPersona?.icon || '🤖'}</span>
                {editedPersona?.name} bearbeiten
              </DialogTitle>
              <DialogDescription>
                Passe die Persönlichkeit und Verhaltensweisen dieser Coach-Persona an.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 pr-4">
              <Tabs defaultValue="basics" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basics">Basis</TabsTrigger>
                  <TabsTrigger value="dials">Dials</TabsTrigger>
                  <TabsTrigger value="phrases">Floskeln</TabsTrigger>
                  <TabsTrigger value="examples">Beispiele</TabsTrigger>
                </TabsList>
                
                {/* Basis Tab */}
                <TabsContent value="basics" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={editedPersona?.name || ''}
                        onChange={(e) => setEditedPersona(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Icon (Emoji)</Label>
                      <Input
                        value={editedPersona?.icon || ''}
                        onChange={(e) => setEditedPersona(prev => prev ? { ...prev, icon: e.target.value } : null)}
                        placeholder="z.B. 🏋️"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Beschreibung</Label>
                    <Textarea
                      value={editedPersona?.description || ''}
                      onChange={(e) => setEditedPersona(prev => prev ? { ...prev, description: e.target.value } : null)}
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Sprachstil (Anweisungen für LLM)</Label>
                    <Textarea
                      value={editedPersona?.language_style || ''}
                      onChange={(e) => setEditedPersona(prev => prev ? { ...prev, language_style: e.target.value } : null)}
                      rows={3}
                      placeholder="z.B. Sprich kurz und prägnant. Verwende Kraftausdrücke wenn angemessen."
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Dialekt (optional)</Label>
                      <Input
                        value={editedPersona?.dialect || ''}
                        onChange={(e) => setEditedPersona(prev => prev ? { ...prev, dialect: e.target.value } : null)}
                        placeholder="z.B. hessisch"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Aktiv</Label>
                      <div className="flex items-center gap-2 pt-2">
                        <Switch
                          checked={editedPersona?.is_active || false}
                          onCheckedChange={(checked) => setEditedPersona(prev => prev ? { ...prev, is_active: checked } : null)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {editedPersona?.is_active ? 'Für User sichtbar' : 'Versteckt'}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Dials Tab */}
                <TabsContent value="dials" className="space-y-6 mt-4">
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium mb-1">🎚️ Personality Dials</h4>
                    <p className="text-sm text-muted-foreground">
                      Diese 7 Dimensionen definieren die Persönlichkeit des Coaches. 
                      Jeder Wert von 1-10 beeinflusst wie der Coach kommuniziert.
                    </p>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    {(Object.keys(DIAL_LABELS) as Array<keyof PersonalityDials>).map((dial) => (
                      <DialSlider
                        key={dial}
                        name={dial}
                        label={DIAL_LABELS[dial]}
                        value={editedPersona?.[`dial_${dial}` as keyof CoachPersona] as number || 5}
                        onChange={(value) => handleDialChange(dial, value)}
                      />
                    ))}
                  </div>
                  
                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">📊 Phrase Frequency</h4>
                    <DialSlider
                      name="phraseFrequency"
                      label="Floskeln-Häufigkeit"
                      value={editedPersona?.phrase_frequency || 5}
                      onChange={handlePhraseFrequencyChange}
                      descriptions={{
                        low: 'Neutral - keine charakteristischen Phrasen',
                        mid: 'Natürlich - gelegentliche Verwendung (empfohlen)',
                        high: 'Häufig - kann "holzig" wirken!'
                      }}
                    />
                    {(editedPersona?.phrase_frequency || 0) > 7 && (
                      <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Hohe Werte können unnatürlich klingen
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                {/* Phrases Tab */}
                <TabsContent value="phrases" className="space-y-4 mt-4">
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium mb-1">💬 Charakteristische Floskeln</h4>
                    <p className="text-sm text-muted-foreground">
                      Diese Phrasen werden je nach Phrase Frequency in die Antworten eingestreut.
                    </p>
                  </div>
                  
                  {/* Existing Phrases */}
                  <div className="space-y-2">
                    {(editedPersona?.phrases || []).map((phrase, index) => (
                      <div key={index} className="flex items-center gap-2 bg-card border rounded-lg p-2">
                        <span className="flex-1 text-sm">{phrase}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePhrase(index)}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {(editedPersona?.phrases || []).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Noch keine Floskeln definiert
                      </p>
                    )}
                  </div>
                  
                  {/* Add Phrase */}
                  <div className="flex gap-2">
                    <Input
                      value={newPhrase}
                      onChange={(e) => setNewPhrase(e.target.value)}
                      placeholder="Neue Floskel eingeben..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPhrase()}
                    />
                    <Button onClick={handleAddPhrase} disabled={!newPhrase.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Examples Tab */}
                <TabsContent value="examples" className="space-y-4 mt-4">
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium mb-1">📝 Beispiel-Antworten</h4>
                    <p className="text-sm text-muted-foreground">
                      Diese Beispiele zeigen dem LLM wie die Persona in verschiedenen Situationen antwortet.
                    </p>
                  </div>
                  
                  {/* Existing Examples */}
                  <div className="space-y-3">
                    {(editedPersona?.example_responses || []).map((example, index) => (
                      <div key={index} className="bg-card border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <Badge variant="outline" className="mb-2">{example.context}</Badge>
                            <p className="text-sm">{example.response}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveExample(index)}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(editedPersona?.example_responses || []).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Noch keine Beispiel-Antworten definiert
                      </p>
                    )}
                  </div>
                  
                  {/* Add Example */}
                  <div className="border rounded-lg p-3 space-y-3">
                    <h5 className="text-sm font-medium">Neue Beispiel-Antwort</h5>
                    <Input
                      value={newExample.context}
                      onChange={(e) => setNewExample(prev => ({ ...prev, context: e.target.value }))}
                      placeholder="Kontext (z.B. 'motivation', 'frustration', 'greeting')"
                    />
                    <Textarea
                      value={newExample.response}
                      onChange={(e) => setNewExample(prev => ({ ...prev, response: e.target.value }))}
                      placeholder="Beispiel-Antwort der Persona..."
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddExample} 
                      disabled={!newExample.context.trim() || !newExample.response.trim()}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Beispiel hinzufügen
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSavePersona} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PersonaEditor;
