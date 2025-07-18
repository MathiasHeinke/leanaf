import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  transcribedText: string;
}

export const useVoiceRecording = (): UseVoiceRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      console.log('Recording started...');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Fehler beim Starten der Aufnahme');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        
        try {
          console.log('Processing audio chunks:', audioChunksRef.current.length);
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert blob to base64
          const arrayBuffer = await audioBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
          const base64Audio = btoa(binaryString);
          
          console.log('Sending audio to transcription service...');
          
          // Send to Supabase Edge Function for transcription
          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64Audio }
          });
          
          if (error) {
            console.error('Transcription error:', error);
            toast.error('Fehler bei der Transkription');
            resolve(null);
            return;
          }
          
          const text = data?.text || '';
          console.log('Transcription result:', text);
          
          setTranscribedText(text);
          
          if (text) {
            toast.success('Audio erfolgreich transkribiert!');
          } else {
            toast.error('Keine Sprache erkannt');
          }
          
          resolve(text);
          
        } catch (error) {
          console.error('Error processing audio:', error);
          toast.error('Fehler bei der Audioverarbeitung');
          resolve(null);
        } finally {
          setIsProcessing(false);
          
          // Clean up
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          audioChunksRef.current = [];
        }
      };
      
      mediaRecorder.stop();
    });
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    transcribedText
  };
};