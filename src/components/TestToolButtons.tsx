import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToolActionButton } from '@/components/ToolActionButton';
import { Badge } from '@/components/ui/badge';

export const TestToolButtons = () => {
  const [testMessages, setTestMessages] = useState([
    {
      id: '1',
      role: 'assistant' as const,
      content: 'Ich sehe deine 3 Sessions mit 8.200kg Volumen - willst du einen Trainingsplan erstellen?',
      pendingTools: [{
        tool: 'trainingsplan',
        label: '🏋️ Trainingsplan erstellen',
        description: 'Erstelle einen Plan basierend auf deinen letzten Workouts',
        confidence: 0.9,
        contextData: {
          sessionsCount: 3,
          totalVolume: 8200,
          averageVolume: 2733
        }
      }]
    }
  ]);

  const [buttonClicked, setButtonClicked] = useState<string | null>(null);

  const handleToolAction = (tool: string, contextData?: any) => {
    setButtonClicked(tool);
    console.log('🔧 Test Tool Action:', tool, contextData);
    
    // Simulate button lifecycle - remove pending tools after click
    setTimeout(() => {
      setTestMessages(prev => prev.map(msg => ({
        ...msg,
        pendingTools: undefined
      })));
    }, 2000);
  };

  const resetTest = () => {
    setButtonClicked(null);
    setTestMessages([{
      id: '1',
      role: 'assistant' as const,
      content: 'Ich sehe deine 3 Sessions mit 8.200kg Volumen - willst du einen Trainingsplan erstellen?',
      pendingTools: [{
        tool: 'trainingsplan',
        label: '🏋️ Trainingsplan erstellen', 
        description: 'Erstelle einen Plan basierend auf deinen letzten Workouts',
        confidence: 0.9,
        contextData: {
          sessionsCount: 3,
          totalVolume: 8200,
          averageVolume: 2733
        }
      }]
    }]);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Tool-Button System Test</CardTitle>
        <CardDescription>
          Test für kontextsensitive Tool-Buttons im Coach-Chat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {testMessages.map((message) => (
            <div key={message.id} className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm">{message.content}</p>
              </div>
              
              {/* Render tool buttons */}
              {message.pendingTools && message.pendingTools.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.pendingTools.map((tool, index) => (
                    <ToolActionButton
                      key={`${tool.tool}-${index}`}
                      tool={tool.tool}
                      label={tool.label}
                      description={tool.description}
                      onClick={() => handleToolAction(tool.tool, tool.contextData)}
                      isVisible={true}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <Badge variant={buttonClicked ? "default" : "secondary"}>
            Status: {buttonClicked ? `Tool "${buttonClicked}" ausgelöst` : 'Warten auf Button-Klick'}
          </Badge>
        </div>

        {/* Reset button */}
        <Button onClick={resetTest} variant="outline" size="sm">
          🔄 Test zurücksetzen
        </Button>

        {/* Test results */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Erwartetes Verhalten:</strong></p>
          <p>1. Button erscheint mit Kontext-Daten</p>
          <p>2. Klick löst handleToolAction aus</p>
          <p>3. Button verschwindet nach 2 Sekunden</p>
          <p>4. Modal würde sich öffnen (simuliert)</p>
        </div>
      </CardContent>
    </Card>
  );
};