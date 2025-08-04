import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseEnhancedVoiceRecordingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  isLoading: boolean;
  transcribedText: string;
  phase: 'recording' | 'transcribing' | 'error';
  recordingTime: number;
  audioFileId: string | null;
  audioLevel: number;
  hasPermission: boolean | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  sendTranscription: () => Promise<string | null>;
  retryTranscription: () => Promise<string | null>;
  clearTranscription: () => void;
  hasCachedAudio: boolean;
  mediaRecorderRef: React.RefObject<MediaRecorder | null>;
}

export const useEnhancedVoiceRecording = (): UseEnhancedVoiceRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<'recording' | 'transcribing' | 'error'>('recording');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioFileId, setAudioFileId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cachedAudioRef = useRef<Blob | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
  const monitorAudioLevel = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current || !isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.error('Error setting up audio monitoring:', error);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setIsLoading(true);
      setPhase('recording');
      setRecordingTime(0);
      console.log('Starting enhanced voice recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      setHasPermission(true);
      
      // Try different audio formats based on browser support
      let mimeType = '';
      const possibleTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      for (const type of possibleTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsLoading(false);
      
      // Setup audio analysis for visual feedback
      monitorAudioLevel(stream);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at 10 minutes
          if (newTime >= 600) {
            stopRecording();
            toast.error('Aufnahme automatisch nach 10 Minuten gestoppt');
          }
          return newTime;
        });
      }, 1000);
      
      console.log('Enhanced recording started successfully');
      
    } catch (error) {
      console.error('Error starting enhanced recording:', error);
      setIsLoading(false);
      setPhase('error');
      setHasPermission(false);
      toast.error('Fehler beim Starten der Aufnahme');
    }
  }, [monitorAudioLevel]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        
        try {
          console.log('Processing audio chunks:', audioChunksRef.current.length);
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Cache the audio blob for potential retry
          cachedAudioRef.current = audioBlob;
          
          console.log('Audio cached for potential retry');
          resolve(''); // Return empty string to indicate successful stop without auto-transcription
          
        } catch (error) {
          console.error('Error processing audio:', error);
          setPhase('error');
          toast.error('Fehler bei der Audioverarbeitung');
          resolve(null);
        } finally {
          // Clean up
          if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
          }
          audioChunksRef.current = [];
          
          // Stop audio level monitoring
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          analyserRef.current = null;
          setAudioLevel(0);
        }
      };
      
      mediaRecorder.stop();
    });
  }, [isRecording]);

  const uploadAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    const base64Audio = btoa(binaryString);
    
    console.log('Uploading audio to server...');
    
    // For now, we'll use the voice-to-text function directly
    // In a production app, you'd want separate upload/transcribe endpoints
    return base64Audio;
  }, []);

  const sendTranscription = useCallback(async (): Promise<string | null> => {
    if (!cachedAudioRef.current) {
      toast.error('Keine Audioaufnahme verfügbar');
      return null;
    }

    setPhase('transcribing');
    return await transcribeWithRetry(cachedAudioRef.current);
  }, []);

  const transcribeWithRetry = useCallback(async (audioBlob: Blob, retryCount = 0): Promise<string | null> => {
    const maxRetries = 3;
    const baseDelay = 1000;
    
    try {
      setIsProcessing(true);
      
      const base64Audio = await uploadAudio(audioBlob);
      
      console.log('Sending audio to enhanced transcription service...');
      
      // Send to Supabase Edge Function for transcription
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });
      
      if (error) {
        throw error;
      }
      
      const text = data?.text || '';
      console.log('Enhanced transcription result:', text);
      
      setTranscribedText(text);
      setPhase('recording');
      
      if (text) {
        toast.success('Audio erfolgreich transkribiert!');
        // Clear cached audio on successful transcription
        cachedAudioRef.current = null;
      } else {
        toast.error('Keine Sprache erkannt');
      }
      
      return text;
      
    } catch (error) {
      console.error(`Enhanced transcription error (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Retrying transcription in ${delay}ms...`);
        
        toast.error(`Transkription fehlgeschlagen, versuche erneut... (${retryCount + 1}/${maxRetries})`);
        
        setTimeout(() => {
          transcribeWithRetry(audioBlob, retryCount + 1);
        }, delay);
        
        return null;
      }
      
      setPhase('error');
      toast.error('Transkription nach mehreren Versuchen fehlgeschlagen');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [uploadAudio]);

  const retryTranscription = useCallback(async (): Promise<string | null> => {
    if (!cachedAudioRef.current) {
      toast.error('Keine Audioaufnahme für Wiederholung verfügbar');
      return null;
    }

    console.log('Retrying transcription with cached audio...');
    setPhase('transcribing');
    return await transcribeWithRetry(cachedAudioRef.current);
  }, [transcribeWithRetry]);

  const clearTranscription = useCallback(() => {
    setTranscribedText('');
    setPhase('recording');
    setRecordingTime(0);
    cachedAudioRef.current = null;
    console.log('Transcription and cached audio cleared');
  }, []);

  return {
    isRecording,
    isProcessing,
    isLoading,
    transcribedText,
    audioLevel,
    hasPermission,
    phase,
    recordingTime,
    audioFileId,
    startRecording,
    stopRecording,
    sendTranscription,
    retryTranscription,
    clearTranscription,
    hasCachedAudio: !!cachedAudioRef.current,
    mediaRecorderRef
  };
};