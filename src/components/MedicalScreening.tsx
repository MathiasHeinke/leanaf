import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MedicalCondition {
  id: string;
  name: string;
  category: string;
  risk_level: string;
  contraindications?: string[];
  fitness_considerations?: string;
  created_at?: string;
  updated_at?: string;
}

interface Medication {
  id: string;
  name: string;
  category: string;
  risk_level: string;
  active_ingredient?: string;
  exercise_interactions?: string[];
  nutrition_interactions?: string[];
  fitness_considerations?: string;
  created_at?: string;
  updated_at?: string;
}

interface RiskAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  considerations: string[];
  contraindications: string[];
}

interface MedicalScreeningProps {
  onScreeningComplete?: (completed: boolean) => void;
}

export const MedicalScreening: React.FC<MedicalScreeningProps> = ({ onScreeningComplete }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Medical screening state
  const [hasMedicalConditions, setHasMedicalConditions] = useState(false);
  const [takesMedications, setTakesMedications] = useState(false);
  
  // Available options from database
  const [availableConditions, setAvailableConditions] = useState<MedicalCondition[]>([]);
  const [availableMedications, setAvailableMedications] = useState<Medication[]>([]);
  
  // Selected conditions and medications
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);
  const [customConditions, setCustomConditions] = useState<string[]>([]);
  const [customMedications, setCustomMedications] = useState<string[]>([]);
  
  // Custom input fields
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');
  
  // Risk assessment
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [screeningCompleted, setScreeningCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      loadMedicalLibraries();
      loadExistingMedicalProfile();
    }
  }, [user]);

  const loadMedicalLibraries = async () => {
    try {
      // Load medical conditions
      const { data: conditions, error: conditionsError } = await supabase
        .from('medical_conditions_library')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (conditionsError) throw conditionsError;
      setAvailableConditions(conditions || []);

      // Load medications
      const { data: medications, error: medicationsError } = await supabase
        .from('medications_library')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (medicationsError) throw medicationsError;
      setAvailableMedications(medications || []);

    } catch (error) {
      console.error('Error loading medical libraries:', error);
      toast.error('Fehler beim Laden der medizinischen Daten');
    }
  };

  const loadExistingMedicalProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_medical_profile')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setHasMedicalConditions(data.has_medical_conditions);
        setTakesMedications(data.takes_medications);
        setSelectedConditions(data.medical_conditions || []);
        setSelectedMedications(data.medications || []);
        setCustomConditions(data.custom_conditions || []);
        setCustomMedications(data.custom_medications || []);
        if (data.risk_assessment && typeof data.risk_assessment === 'object') {
          setRiskAssessment(data.risk_assessment as unknown as RiskAssessment);
        }
        setScreeningCompleted(true);
        onScreeningComplete?.(true);
      }
    } catch (error) {
      console.error('Error loading medical profile:', error);
    }
  };

  const addCustomCondition = () => {
    if (newCondition.trim()) {
      setCustomConditions([...customConditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const addCustomMedication = () => {
    if (newMedication.trim()) {
      setCustomMedications([...customMedications, newMedication.trim()]);
      setNewMedication('');
    }
  };

  const removeCustomCondition = (index: number) => {
    setCustomConditions(customConditions.filter((_, i) => i !== index));
  };

  const removeCustomMedication = (index: number) => {
    setCustomMedications(customMedications.filter((_, i) => i !== index));
  };

  const handleConditionToggle = (conditionId: string) => {
    setSelectedConditions(prev => 
      prev.includes(conditionId) 
        ? prev.filter(id => id !== conditionId)
        : [...prev, conditionId]
    );
  };

  const handleMedicationToggle = (medicationId: string) => {
    setSelectedMedications(prev => 
      prev.includes(medicationId) 
        ? prev.filter(id => id !== medicationId)
        : [...prev, medicationId]
    );
  };

  const saveSelectionAndAssess = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Zuerst die Auswahl speichern
      const { error: saveError } = await supabase
        .from('user_medical_profile')
        .upsert({
          user_id: user.id,
          has_medical_conditions: hasMedicalConditions,
          takes_medications: takesMedications,
          medical_conditions: selectedConditions,
          medications: selectedMedications,
          custom_conditions: customConditions,
          custom_medications: customMedications,
          updated_at: new Date().toISOString()
        });

      if (saveError) throw saveError;

      // Dann die Risikobewertung durchführen
      const { data, error } = await supabase.rpc('perform_medical_risk_assessment', {
        p_user_id: user.id,
        p_conditions: selectedConditions,
        p_custom_conditions: customConditions,
        p_medications: selectedMedications,
        p_custom_medications: customMedications
      });

      if (error) throw error;

      if (data && typeof data === 'object') {
        setRiskAssessment(data as unknown as RiskAssessment);
      }
      setScreeningCompleted(true);
      onScreeningComplete?.(true);
      toast.success('Medizinisches Screening abgeschlossen');

    } catch (error) {
      console.error('Error performing risk assessment:', error);
      toast.error('Fehler bei der Risikobewertung');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskLevelBg = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-50 border-green-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'critical': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'medium': return <Info className="h-5 w-5 text-yellow-500" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'critical': return <ShieldAlert className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  // Group conditions by category
  const conditionsByCategory = availableConditions.reduce((acc, condition) => {
    if (!acc[condition.category]) {
      acc[condition.category] = [];
    }
    acc[condition.category].push(condition);
    return acc;
  }, {} as Record<string, MedicalCondition[]>);

  // Group medications by category
  const medicationsByCategory = availableMedications.reduce((acc, medication) => {
    if (!acc[medication.category]) {
      acc[medication.category] = [];
    }
    acc[medication.category].push(medication);
    return acc;
  }, {} as Record<string, Medication[]>);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 bg-red-500 rounded-xl flex items-center justify-center">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold">Medizinische Informationen</h2>
      </div>

      {/* Disclaimer Card */}
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          <strong>Wichtiger Hinweis:</strong> Diese App ist ein Fitness-Tool und kein medizinisches Gerät. 
          Die hier bereitgestellten Informationen ersetzen keinen Arztbesuch. Bei gesundheitlichen Problemen 
          konsultieren Sie bitte immer einen qualifizierten Arzt.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="space-y-6 pt-5">
          {/* Initial Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="has-conditions" className="text-base font-medium">
                Hast du bekannte Vorerkrankungen?
              </Label>
              <Switch
                id="has-conditions"
                checked={hasMedicalConditions}
                onCheckedChange={setHasMedicalConditions}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="takes-medications" className="text-base font-medium">
                Nimmst du regelmäßig Medikamente?
              </Label>
              <Switch
                id="takes-medications"
                checked={takesMedications}
                onCheckedChange={setTakesMedications}
              />
            </div>
          </div>

          {/* Medical Conditions Selection */}
          {hasMedicalConditions && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vorerkrankungen</h3>
              
              {Object.entries(conditionsByCategory).map(([category, conditions]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-muted-foreground">{category}</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {conditions.map((condition) => (
                      <div key={condition.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={condition.id}
                          checked={selectedConditions.includes(condition.id)}
                          onCheckedChange={() => handleConditionToggle(condition.id)}
                        />
                        <Label htmlFor={condition.id} className="flex-1 cursor-pointer">
                          <span className={getRiskLevelColor(condition.risk_level)}>
                            {condition.name}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Custom conditions */}
              <div className="space-y-2">
                <h4 className="font-medium text-muted-foreground">Weitere Erkrankungen</h4>
                <div className="flex gap-2">
                  <Input
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="Erkrankung hinzufügen..."
                  />
                  <Button onClick={addCustomCondition} size="sm">Hinzufügen</Button>
                </div>
                {customConditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex-1 text-sm bg-muted px-2 py-1 rounded">{condition}</span>
                    <Button
                      onClick={() => removeCustomCondition(index)}
                      size="sm"
                      variant="outline"
                    >
                      Entfernen
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medications Selection */}
          {takesMedications && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Medikamente</h3>
              
              {Object.entries(medicationsByCategory).map(([category, medications]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-muted-foreground">{category}</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {medications.map((medication) => (
                      <div key={medication.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={medication.id}
                          checked={selectedMedications.includes(medication.id)}
                          onCheckedChange={() => handleMedicationToggle(medication.id)}
                        />
                        <Label htmlFor={medication.id} className="flex-1 cursor-pointer">
                          <span className={getRiskLevelColor(medication.risk_level)}>
                            {medication.name}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Custom medications */}
              <div className="space-y-2">
                <h4 className="font-medium text-muted-foreground">Weitere Medikamente</h4>
                <div className="flex gap-2">
                  <Input
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="Medikament hinzufügen..."
                  />
                  <Button onClick={addCustomMedication} size="sm">Hinzufügen</Button>
                </div>
                {customMedications.map((medication, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex-1 text-sm bg-muted px-2 py-1 rounded">{medication}</span>
                    <Button
                      onClick={() => removeCustomMedication(index)}
                      size="sm"
                      variant="outline"
                    >
                      Entfernen
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assessment Button */}
          {(hasMedicalConditions || takesMedications) && !screeningCompleted && (
            <Button
              onClick={saveSelectionAndAssess}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Bewertung läuft...' : 'Risikobewertung durchführen'}
            </Button>
          )}

          {/* Risk Assessment Results */}
          {riskAssessment && (
            <div className={`p-4 rounded-lg border ${getRiskLevelBg(riskAssessment.risk_level)}`}>
              <div className="flex items-center gap-2 mb-3">
                {getRiskIcon(riskAssessment.risk_level)}
                <h3 className="font-semibold">
                  Risikobewertung: <span className={getRiskLevelColor(riskAssessment.risk_level)}>
                    {riskAssessment.risk_level === 'low' && 'Niedriges Risiko'}
                    {riskAssessment.risk_level === 'medium' && 'Mittleres Risiko'}
                    {riskAssessment.risk_level === 'high' && 'Hohes Risiko'}
                    {riskAssessment.risk_level === 'critical' && 'Kritisches Risiko'}
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {riskAssessment.recommendations.map((recommendation, index) => (
                  <div key={index} className="text-sm">
                    • {recommendation}
                  </div>
                ))}
              </div>

              {riskAssessment.considerations.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <h4 className="font-medium mb-2">Wichtige Hinweise:</h4>
                  {riskAssessment.considerations.map((consideration, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {consideration}
                    </div>
                  ))}
                </div>
              )}

              {riskAssessment.contraindications.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <h4 className="font-medium mb-2 text-red-600">Kontraindikationen:</h4>
                  {riskAssessment.contraindications.map((contraindication, index) => (
                    <div key={index} className="text-sm text-red-600">
                      • {contraindication}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completion for users with no conditions/medications */}
          {!hasMedicalConditions && !takesMedications && !screeningCompleted && (
            <Button
              onClick={() => {
                setScreeningCompleted(true);
                onScreeningComplete?.(true);
                saveSelectionAndAssess(); // This will create a "low risk" profile
              }}
              className="w-full"
            >
              Screening abschließen
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};