import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface PasswordStrength {
  score: number;
  max_score: number;
  is_strong: boolean;
  is_valid: boolean;
  feedback: string[];
  strength: 'very_weak' | 'weak' | 'medium' | 'strong' | 'very_strong';
}

export const PasswordStrengthIndicator = ({ password, className = '' }: PasswordStrengthProps) => {
  const [strength, setStrength] = useState<PasswordStrength | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!password || password.length < 3) {
      setStrength(null);
      return;
    }

    const checkStrength = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('validate_password_strength', {
          password: password
        });
        
        if (error) {
          console.error('Error checking password strength:', error);
          return;
        }
        
        setStrength(data as unknown as PasswordStrength);
      } catch (error) {
        console.error('Error checking password strength:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(checkStrength, 300);
    return () => clearTimeout(debounceTimer);
  }, [password]);

  if (!strength || !password) {
    return null;
  }

  const getStrengthColor = () => {
    switch (strength.strength) {
      case 'very_strong': return 'hsl(var(--success))';
      case 'strong': return 'hsl(var(--success))';
      case 'medium': return 'hsl(var(--warning))';
      case 'weak': return 'hsl(var(--destructive))';
      case 'very_weak': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getStrengthText = () => {
    switch (strength.strength) {
      case 'very_strong': return 'Sehr stark';
      case 'strong': return 'Stark';
      case 'medium': return 'Mittel';
      case 'weak': return 'Schwach';
      case 'very_weak': return 'Sehr schwach';
      default: return '';
    }
  };

  const getStrengthIcon = () => {
    if (strength.is_strong) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    } else if (strength.strength === 'medium') {
      return <AlertCircle className="h-4 w-4 text-warning" />;
    } else {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const progressValue = (strength.score / strength.max_score) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStrengthIcon()}
          <span className="text-sm font-medium" style={{ color: getStrengthColor() }}>
            {getStrengthText()}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {strength.score}/{strength.max_score}
        </span>
      </div>
      
      <Progress 
        value={progressValue} 
        className="h-2"
        style={{
          '--progress-foreground': getStrengthColor()
        } as React.CSSProperties}
      />
      
      {strength.feedback && strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((feedback, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-1 w-1 rounded-full bg-muted-foreground" />
              {feedback}
            </div>
          ))}
        </div>
      )}
      
      {strength.is_valid && (
        <div className="flex items-center gap-2 text-xs text-success">
          <CheckCircle className="h-3 w-3" />
          Passwort erfüllt die Sicherheitsanforderungen
        </div>
      )}
    </div>
  );
};