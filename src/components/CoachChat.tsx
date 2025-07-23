import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Brain } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalCoachChat } from "@/hooks/useGlobalCoachChat";
import { CoachLimitHandler } from './CoachLimitHandler';

const CoachPage = () => {
  const {
    inputText,
    setInputText,
    handleSubmitMessage,
    handleVoiceRecord,
    isThinking,
    isRecording,
    isProcessing,
    chatHistory,
    clearChat
  } = useGlobalCoachChat();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [limitError, setLimitError] = useState<any>(null);

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      toast.error('Bitte Text eingeben');
      return;
    }

    setIsLoading(true);
    setLimitError(null); // Clear previous errors
    
    try {
      await handleSubmitMessage();
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Check if it's a usage limit error
      if (error.message?.includes('Limit erreicht') || error.status === 429 || error.code === 'USAGE_LIMIT_EXCEEDED') {
        setLimitError(error);
      } else {
        toast.error(error.message || 'Fehler beim Senden der Nachricht');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {limitError && (
        <CoachLimitHandler 
          error={limitError} 
          featureType="coach_chat" 
        />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Coach Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] mb-4">
            <div className="space-y-4">
              {chatHistory.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1 mb-2">
                        <Brain className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground font-medium">KaloAI Coach</span>
                      </div>
                    )}
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-secondary text-secondary-foreground">
                    <div className="flex items-center gap-1 mb-2">
                      <Brain className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground font-medium">KaloAI Coach</span>
                    </div>
                    <p>Denkt...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex items-center space-x-2">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Frag den Coach..."
              className="flex-1 resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputText.trim()) {
                    handleSubmit();
                  }
                }
              }}
            />
            <Button onClick={handleSubmit} disabled={!inputText.trim() || isLoading}>
              {isLoading ? 'Senden...' : 'Senden'}
            </Button>
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={handleVoiceRecord} disabled={isThinking || isProcessing}>
              {isRecording ? 'Aufnahme stoppen' : 'Sprachnachricht'}
            </Button>
            <Button variant="destructive" onClick={clearChat}>
              Chat leeren
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachPage;
