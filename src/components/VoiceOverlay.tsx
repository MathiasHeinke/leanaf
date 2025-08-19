import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowUpSquare, RotateCcw } from 'lucide-react';
import { useInputBarHeight } from '@/hooks/useInputBarHeight';
import { VoiceCanvasWaveform } from './VoiceCanvasWaveform';
import { supabase } from '@/integrations/supabase/client';

interface VoiceOverlayProps {
  onTextGenerated: (text: string) => void;
  onClose: () => void;
}

type Phase = 'recording' | 'processing' | 'error';

export function VoiceOverlay({ onTextGenerated, onClose }: VoiceOverlayProps) {
  const inputBarHeight = useInputBarHeight();
  const [phase, setPhase] = useState<Phase>('recording');
  const [seconds, setSeconds] = useState(0);
  const [fileId, setFileId] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Start recording and timer
  useEffect(() => {
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // Setup audio analysis for waveform
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128; // Smaller FFT for calmer waveform
        analyser.smoothingTimeConstant = 0.8;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyserRef.current = analyser;

        // Setup MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'audio/webm;codecs=opus' 
        });
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;

        // Start timer
        timerRef.current = window.setInterval(() => {
          setSeconds(prev => prev + 1);
        }, 1000);

        // Monitor audio level for waveform
        const updateAudioLevel = () => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(average / 255);
          }
          if (phase === 'recording') {
            requestAnimationFrame(updateAudioLevel);
          }
        };
        updateAudioLevel();

      } catch (error) {
        console.error('Failed to start recording:', error);
        onClose();
      }
    };

    startRecording();

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadAudio = async (): Promise<string> => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob);

    const { data, error } = await supabase.functions.invoke('upload-audio', {
      body: formData,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.fileId;
  };

  const transcribeAudio = async (fileId: string): Promise<string> => {
    // Make direct HTTP call since invoke doesn't support query params easily
    const response = await fetch(
      `https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/transcribe-audio?fileId=${fileId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Transcription failed');
    }

    const result = await response.json();
    return result.text;
  };

  const handleStopAndTranscribe = () => {
    if (!mediaRecorderRef.current || phase !== 'recording') return;

    // Stop timer immediately when user clicks stop
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setPhase('processing'); // Start processing immediately

    mediaRecorderRef.current.onstop = async () => {
      try {
        // Clean up streams
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Parallel upload and transcription
        const uploadPromise = uploadAudio();
        
        const uploadedFileId = await uploadPromise;
        setFileId(uploadedFileId);
        
        const transcribedText = await transcribeAudio(uploadedFileId);
        onTextGenerated(transcribedText);
        onClose();
      } catch (error) {
        console.error('Error during transcription:', error);
        setPhase('error');
      }
    };

    mediaRecorderRef.current.stop();
  };

  const handleRetry = async () => {
    if (!fileId) return;
    
    setPhase('processing'); // Reset to processing state
    
    try {
      const transcribedText = await transcribeAudio(fileId);
      onTextGenerated(transcribedText);
      onClose();
    } catch (error) {
      console.error('Retry failed:', error);
      setPhase('error');
    }
  };

  const handleCancel = () => {
    cleanup();
    onClose();
  };

  // Format timer
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  // Status text based on phase
  const getStatusText = () => {
    switch (phase) {
      case 'recording': return 'Ich höre zu …';
      case 'processing': return 'Wird transkribiert …';
      case 'error': return 'Transkription fehlgeschlagen';
      default: return '';
    }
  };

  return (
    <div 
      className="fixed inset-x-0 bottom-0 flex flex-col items-center justify-center bg-white/85 dark:bg-neutral-900/85 z-50 backdrop-blur-sm px-4"
      style={{ height: inputBarHeight, pointerEvents: 'none' }}
    >
      {/* Cancel Button - Center Left */}
      <button
        onClick={handleCancel}
        className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex justify-center items-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
        aria-label="Aufnahme abbrechen"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Action Button - Center Right */}
      {phase === 'error' ? (
        <button
          onClick={handleRetry}
          className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex justify-center items-center text-orange-500 hover:text-orange-600 transition-colors"
          aria-label="Erneut versuchen"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      ) : (
        <button
          onClick={handleStopAndTranscribe}
          disabled={phase !== 'recording'}
          className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex justify-center items-center text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
          aria-label="Aufnahme stoppen & transkribieren"
        >
          <ArrowUpSquare className="w-6 h-6" />
        </button>
      )}

      {/* Center - Waveform + Info - Centered both horizontally and vertically */}
      <div className="flex flex-col items-center justify-center pointer-events-none">
        <VoiceCanvasWaveform 
          audioLevel={audioLevel} 
          isActive={phase === 'recording'} 
          width={160} 
          height={32} 
        />
        <span className="text-sm mt-2 text-neutral-600 dark:text-neutral-400 font-mono">
          {minutes}:{secs}
        </span>
        <p className="text-sm mt-1 text-neutral-600 dark:text-neutral-400">
          {getStatusText()}
        </p>
      </div>
    </div>
  );
}