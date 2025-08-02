
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseEnhancedVoiceRecordingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  isLoading: boolean;
  transcribedText: string;
  transcript: string;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  clearTranscription: () => void;
  retryTranscription: () => Promise<string | null>;
  hasPermission: boolean;
  hasCachedAudio: boolean;
}

export const useEnhancedVoiceRecording = (): UseEnhancedVoiceRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [cachedAudioBlob, setCachedAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Check for microphone permission
  const checkPermission = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setHasPermission(result.state === 'granted');
      return result.state === 'granted';
    } catch (error) {
      console.log('Permission API not supported, will request on first use');
      return false;
    }
  }, []);

  // Monitor audio levels for visual feedback
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting enhanced voice recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setHasPermission(true);
      
      // Set up audio analysis for visual feedback
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
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
      
      mediaRecorder.start(100);
      setIsRecording(true);
      
      // Start audio level monitoring
      monitorAudioLevel();
      
      console.log('✅ Enhanced recording started with audio monitoring');
      
    } catch (error) {
      console.error('❌ Error starting enhanced recording:', error);
      toast.error('Fehler beim Starten der Aufnahme. Bitte Mikrofon-Berechtigung prüfen.');
    }
  }, [monitorAudioLevel]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    console.log('🛑 Stopping enhanced voice recording...');

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        setAudioLevel(0);
        
        // Stop audio monitoring
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        try {
          console.log('🔄 Processing audio chunks:', audioChunksRef.current.length);
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Cache audio blob for potential retries
          setCachedAudioBlob(audioBlob);
          
          // Try transcription with retry logic
          const transcriptionResult = await transcribeWithRetry(audioBlob);
          
          if (transcriptionResult) {
            setTranscribedText(transcriptionResult);
            setTranscript(transcriptionResult);
            toast.success(`Sprache erkannt: "${transcriptionResult.substring(0, 50)}${transcriptionResult.length > 50 ? '...' : ''}"`);
            // Clear cache on success
            setCachedAudioBlob(null);
          } else {
            toast.error('Audio gespeichert - versuche es nochmal oder nutze den Button "Nochmal senden"');
          }
          
          resolve(transcriptionResult);
          
        } catch (error) {
          console.error('❌ Error processing enhanced audio:', error);
          toast.error('Fehler bei der Audioverarbeitung');
          resolve(null);
        } finally {
          setIsProcessing(false);
          
          // Clean up
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          audioChunksRef.current = [];
          analyserRef.current = null;
        }
      };
      
      mediaRecorder.stop();
    });
  }, [isRecording]);

  // Transcription with retry logic
  const transcribeWithRetry = async (audioBlob: Blob, maxRetries = 3): Promise<string | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 Transcription attempt ${attempt}/${maxRetries}`);
        
        // Convert blob to base64
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
        const base64Audio = btoa(binaryString);
        
        // Send to Supabase Edge Function for transcription
        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });
        
        if (error) throw error;
        
        const text = data?.text || '';
        console.log(`✅ Transcription successful on attempt ${attempt}:`, text);
        return text;
        
      } catch (error) {
        console.error(`❌ Transcription attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error('❌ All transcription attempts failed');
          return null;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return null;
  };

  // Retry transcription with cached audio
  const retryTranscription = useCallback(async (): Promise<string | null> => {
    if (!cachedAudioBlob) {
      toast.error('Kein Audio gespeichert - bitte neu aufnehmen');
      return null;
    }
    
    setIsLoading(true);
    console.log('🔄 Retrying transcription with cached audio...');
    
    try {
      const result = await transcribeWithRetry(cachedAudioBlob);
      
      if (result) {
        setTranscript(result);
        setTranscribedText(result);
        toast.success(`Sprache erkannt: "${result.substring(0, 50)}${result.length > 50 ? '...' : ''}"`);
        setCachedAudioBlob(null); // Clear cache on success
      } else {
        toast.error('Transkription fehlgeschlagen - bitte neu aufnehmen');
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [cachedAudioBlob]);

  const clearTranscription = useCallback(() => {
    setTranscript('');
    setTranscribedText('');
    setCachedAudioBlob(null);
    console.log('🗑️ Transcription and cache cleared');
  }, []);

  return {
    isRecording,
    isProcessing,
    isLoading,
    transcript,
    transcribedText,
    audioLevel,
    startRecording,
    stopRecording,
    clearTranscription,
    retryTranscription,
    hasPermission,
    hasCachedAudio: !!cachedAudioBlob
  };
};
