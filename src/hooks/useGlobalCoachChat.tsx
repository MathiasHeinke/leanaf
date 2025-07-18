import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";

export const useGlobalCoachChat = () => {
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  
  const { user } = useAuth();
  const voiceHook = useVoiceRecording();
  const isRecording = voiceHook?.isRecording || false;
  const isProcessing = voiceHook?.isProcessing || false;
  const startRecording = voiceHook?.startRecording || (() => Promise.resolve());
  const stopRecording = voiceHook?.stopRecording || (() => Promise.resolve(null));

  const handleSubmitMessage = async () => {
    if (!inputText.trim()) {
      toast.error('Bitte Text eingeben');
      return;
    }

    const userMessage = inputText;
    setInputText("");
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsThinking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: userMessage,
          userId: user.id,
          chatHistory: chatHistory
        }
      });

      if (error) throw error;
      
      if (data?.reply) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
        toast.success('Coach-Antwort erhalten!');
        
        // Trigger refresh event for coach updates
        window.dispatchEvent(new CustomEvent('coach-message-sent'));
      }
    } catch (error: any) {
      console.error('Error sending coach message:', error);
      toast.error(error.message || 'Fehler beim Senden der Nachricht');
    } finally {
      setIsThinking(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setInputText(prev => prev ? prev + ' ' + transcribedText : transcribedText);
        toast.success('Spracheingabe hinzugefügt');
      }
    } else {
      try {
        await startRecording();
      } catch (error) {
        toast.error('Fehler bei der Sprachaufnahme');
      }
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    setInputText("");
    toast.success('Chat geleert');
  };

  return {
    inputText,
    setInputText,
    handleSubmitMessage,
    handleVoiceRecord,
    isThinking,
    isRecording,
    isProcessing,
    chatHistory,
    clearChat
  };
};