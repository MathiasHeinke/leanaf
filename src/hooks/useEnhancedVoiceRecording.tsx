
import { useState, useRef, useCallback, useEffect } from 'react';
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
  stopRecording: () => Promise<void>;
  clearTranscription: () => void;
  retryTranscription: () => Promise<string | null>;
  sendTranscription: () => Promise<string | null>;
  hasPermission: boolean;
  hasCachedAudio: boolean;
  hasPersistedAudio: boolean;
  retryFromServer: () => Promise<string | null>;
  clearPersistedAudio: () => void;
}

const AUDIO_STORAGE_KEY = 'voice_recording_audio';
const AUDIO_META_STORAGE_KEY = 'voice_recording_meta';

export const useEnhancedVoiceRecording = (): UseEnhancedVoiceRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [cachedAudioBlob, setCachedAudioBlob] = useState<Blob | null>(null);
  const [serverFileId, setServerFileId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Check for persisted audio on mount
  useEffect(() => {
    const checkPersistedAudio = () => {
      try {
        const persistedMeta = localStorage.getItem(AUDIO_META_STORAGE_KEY);
        if (persistedMeta) {
          const meta = JSON.parse(persistedMeta);
          setServerFileId(meta.fileId || null);
          console.log('📁 Found persisted audio metadata:', meta);
        }
        
        const persistedAudio = localStorage.getItem(AUDIO_STORAGE_KEY);
        if (persistedAudio) {
          // Convert base64 back to blob
          try {
            const binaryString = atob(persistedAudio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/webm' });
            setCachedAudioBlob(blob);
            console.log('📁 Restored audio from LocalStorage');
          } catch (error) {
            console.error('❌ Failed to restore audio from LocalStorage:', error);
            localStorage.removeItem(AUDIO_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('❌ Error checking persisted audio:', error);
      }
    };

    checkPersistedAudio();
  }, []);

  // Save audio to LocalStorage
  const saveAudioToStorage = useCallback(async (audioBlob: Blob) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      const base64Audio = btoa(binaryString);
      
      localStorage.setItem(AUDIO_STORAGE_KEY, base64Audio);
      console.log('💾 Audio saved to LocalStorage');
    } catch (error) {
      console.error('❌ Failed to save audio to LocalStorage:', error);
    }
  }, []);

  // Upload audio to server
  const uploadAudioToServer = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    try {
      console.log('📤 Uploading audio to server...');
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      const { data, error } = await supabase.functions.invoke('upload-audio', {
        body: formData
      });
      
      if (error) throw error;
      
      const fileId = data?.fileId;
      if (fileId) {
        setServerFileId(fileId);
        
        // Save metadata to LocalStorage
        const metadata = {
          fileId,
          uploadedAt: new Date().toISOString(),
          timestamp: Date.now()
        };
        localStorage.setItem(AUDIO_META_STORAGE_KEY, JSON.stringify(metadata));
        
        console.log('✅ Audio uploaded to server with ID:', fileId);
        return fileId;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to upload audio to server:', error);
      return null;
    }
  }, []);

  // Clear persisted audio
  const clearPersistedAudio = useCallback(() => {
    localStorage.removeItem(AUDIO_STORAGE_KEY);
    localStorage.removeItem(AUDIO_META_STORAGE_KEY);
    setServerFileId(null);
    setCachedAudioBlob(null);
    console.log('🗑️ Cleared all persisted audio');
  }, []);

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

  const stopRecording = useCallback(async (): Promise<void> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return;
    }

    console.log('🛑 Stopping enhanced voice recording...');

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setAudioLevel(0);
        
        // Stop audio monitoring
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        try {
          console.log('🔄 Processing audio chunks:', audioChunksRef.current.length);
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Cache audio blob and save to storage for persistence
          setCachedAudioBlob(audioBlob);
          
          // Save to LocalStorage for quick recovery
          await saveAudioToStorage(audioBlob);
          
          // Upload to server for long-term storage (don't wait)
          uploadAudioToServer(audioBlob).catch(error => {
            console.error('❌ Background server upload failed:', error);
          });
          
          console.log('✅ Audio recorded and cached, starting automatic transcription...');
          
          // Automatically start transcription after recording
          setIsProcessing(true);
          
          try {
            const transcriptionResult = await transcribeWithRetry(audioBlob);
            
            if (transcriptionResult) {
              setTranscribedText(transcriptionResult);
              setTranscript(transcriptionResult);
              toast.success(`Sprache erkannt: "${transcriptionResult.substring(0, 50)}${transcriptionResult.length > 50 ? '...' : ''}"`);
              
              // Clear all cached audio after successful transcription
              clearPersistedAudio();
            } else {
              toast.error('Transkription fehlgeschlagen');
            }
          } catch (transcriptionError) {
            console.error('❌ Auto-transcription failed:', transcriptionError);
            toast.error('Transkription fehlgeschlagen');
          } finally {
            setIsProcessing(false);
          }
          
          resolve();
          
        } catch (error) {
          console.error('❌ Error processing enhanced audio:', error);
          toast.error('Fehler bei der Audioverarbeitung');
          resolve();
        } finally {
          // Clean up
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          audioChunksRef.current = [];
          analyserRef.current = null;
        }
      };
      
      mediaRecorder.stop();
    });
  }, [isRecording]);

  // Send transcription explicitly
  const sendTranscription = useCallback(async (): Promise<string | null> => {
    if (!cachedAudioBlob) {
      toast.error('Kein Audio vorhanden');
      return null;
    }
    
    setIsProcessing(true);
    console.log('📤 Sending audio for transcription...');
    
    try {
      const transcriptionResult = await transcribeWithRetry(cachedAudioBlob);
      
      if (transcriptionResult) {
        setTranscribedText(transcriptionResult);
        setTranscript(transcriptionResult);
        toast.success(`Sprache erkannt: "${transcriptionResult.substring(0, 50)}${transcriptionResult.length > 50 ? '...' : ''}"`);
        clearPersistedAudio();
      } else {
        toast.error('Transkription fehlgeschlagen');
      }
      
      return transcriptionResult;
    } finally {
      setIsProcessing(false);
    }
  }, [cachedAudioBlob]);

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
        clearPersistedAudio(); // Clear all persisted audio on success
      } else {
        toast.error('Transkription fehlgeschlagen - bitte neu aufnehmen');
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [cachedAudioBlob]);

  // Retry transcription from server
  const retryFromServer = useCallback(async (): Promise<string | null> => {
    if (!serverFileId) {
      toast.error('Keine Server-Datei verfügbar');
      return null;
    }
    
    setIsLoading(true);
    console.log('🔄 Retrying transcription from server file:', serverFileId);
    
    try {
      // Get file from server and transcribe
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { fileId: serverFileId }
      });
      
      if (error) throw error;
      
      const result = data?.text || '';
      
      if (result) {
        setTranscript(result);
        setTranscribedText(result);
        toast.success(`Sprache erkannt: "${result.substring(0, 50)}${result.length > 50 ? '...' : ''}"`);
        clearPersistedAudio(); // Clear on success
      } else {
        toast.error('Server-Transkription fehlgeschlagen');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Server transcription failed:', error);
      toast.error('Server-Transkription fehlgeschlagen');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [serverFileId, clearPersistedAudio]);

  const clearTranscription = useCallback(() => {
    setTranscript('');
    setTranscribedText('');
    clearPersistedAudio();
    console.log('🗑️ Transcription and all persisted audio cleared');
  }, [clearPersistedAudio]);

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
    sendTranscription,
    hasPermission,
    hasCachedAudio: !!cachedAudioBlob,
    hasPersistedAudio: !!cachedAudioBlob || !!serverFileId,
    retryFromServer,
    clearPersistedAudio
  };
};
