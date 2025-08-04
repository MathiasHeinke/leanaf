import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Mic, 
  Loader2, 
  Wrench, 
  MessageCircle, 
  FileText,
  X,
  ArrowUp,
  Plus,
  RotateCcw,
  Scale,
  Utensils,
  Dumbbell,
  Pill
} from 'lucide-react';
import { toast } from 'sonner';

import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';
import { usePendingTools } from '@/hooks/usePendingTools';
import { VoiceWaveAnimation } from './VoiceWaveAnimation';

// Helper function to determine media type from URL
const getMediaType = (url: string): 'image' | 'video' | 'unknown' => {
  const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (extension && imageExtensions.includes(extension)) {
    return 'image';
  } else if (extension && videoExtensions.includes(extension)) {
    return 'video';
  }
  
  return 'unknown';
};

// Tool definitions
const TOOLS = [
  { id: 'weight', name: 'Gewicht tracken', color: 'bg-blue-500', icon: Scale },
  { id: 'meal', name: 'Mahlzeit loggen', color: 'bg-green-500', icon: Utensils },
  { id: 'workout', name: 'Training erfassen', color: 'bg-purple-500', icon: Dumbbell },
  { id: 'supplement', name: 'Supplement tracken', color: 'bg-yellow-500', icon: Pill },
];

// Suggestion examples
const getSuggestions = () => [
  "Wie viele Kalorien sollte ich heute essen?",
  "Erstelle mir einen Trainingsplan",
  "Analysiere meine letzten Mahlzeiten",
  "Welche Supplements sind sinnvoll?"
];

interface EnhancedChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: (text: string, mediaUrls?: string[], tool?: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const EnhancedChatInput: React.FC<EnhancedChatInputProps> = ({
  inputText,
  setInputText,
  onSendMessage,
  isLoading = false,
  placeholder = "Schreibe eine Nachricht...",
  className
}) => {
  // State for various UI components
  const [uploadedMedia, setUploadedMedia] = useState<Array<{url: string, type: 'image' | 'video' | 'unknown'}>>([]);
  const [showTools, setShowTools] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions] = useState(getSuggestions());

  // File input ref for native picker
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hooks for functionality
  const { uploadFiles, uploading, uploadProgress } = useMediaUpload();
  const {
    isRecording,
    isProcessing,
    transcribedText: voiceText,
    audioLevel,
    startRecording,
    stopRecording,
    sendTranscription,
    retryTranscription,
    clearTranscription,
    hasCachedAudio
  } = useEnhancedVoiceRecording();
  
  const { pendingTools, addPendingTool, removePendingTool, clearAllPendingTools } = usePendingTools();

  // Effect for managing transcribed text
  useEffect(() => {
    if (voiceText) {
      setInputText(inputText + (inputText ? ' ' : '') + voiceText);
      clearTranscription();
    }
  }, [voiceText, clearTranscription, inputText]);

  // Effect for textarea auto-resizing
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  // Handle native file selection
  const handleFileSelection = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      const urls = await uploadFiles(files);
      const mediaItems = urls.map(url => ({
        url,
        type: getMediaType(url)
      }));
      setUploadedMedia(prev => [...prev, ...mediaItems]);
      toast.success(`${files.length} Datei(en) erfolgreich hochgeladen`);
    } catch (error) {
      toast.error('Fehler beim Hochladen der Dateien');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadFiles]);

  // Handle plus button click (native file picker)
  const handlePlusClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Voice recording handlers
  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleVoiceCancel = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    }
    clearTranscription();
  }, [isRecording, stopRecording, clearTranscription]);

  const handleVoiceSend = useCallback(async () => {
    if (hasCachedAudio) {
      const result = await sendTranscription();
      if (result) {
        setInputText(inputText + (inputText ? ' ' : '') + result);
      }
    }
  }, [hasCachedAudio, sendTranscription, setInputText, inputText]);

  const handleVoiceRetry = useCallback(async () => {
    const result = await retryTranscription();
    if (result) {
      setInputText(inputText + (inputText ? ' ' : '') + result);
    }
  }, [retryTranscription, setInputText, inputText]);

  // Tool selection logic
  const handleToolSelect = useCallback((toolId: string) => {
    if (pendingTools.some(tool => tool.tool === toolId)) {
      removePendingTool(toolId);
    } else {
      addPendingTool({ tool: toolId, label: toolId, confidence: 1 });
    }
  }, [pendingTools, addPendingTool, removePendingTool]);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setInputText(suggestion);
    setShowSuggestions(false);
  }, [setInputText]);

  // Handle sending message
  const handleSend = useCallback(() => {
    if (!inputText.trim() && uploadedMedia.length === 0) return;
    
    const mediaUrls = uploadedMedia.map(media => media.url);
    const selectedTool = pendingTools.length > 0 ? pendingTools[0].tool : undefined;
    
    onSendMessage(inputText, mediaUrls, selectedTool);
    
    // Reset form
    setInputText('');
    setUploadedMedia([]);
    clearAllPendingTools();
    setShowTools(false);
    setShowSuggestions(false);
  }, [inputText, uploadedMedia, pendingTools, onSendMessage, setInputText, clearAllPendingTools]);

  // Handle key press for send on Enter
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Remove media from preview
  const removeMedia = useCallback((index: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={cn("relative bg-background border border-border rounded-lg shadow-sm", className)}>
      {/* Hidden file input for native picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelection}
        className="hidden"
      />

      {/* Upload Progress */}
      {uploading && (
        <div className="px-4 py-2 border-b border-border">
          <div className="space-y-2">
            {uploadProgress.map((progress, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div className="flex-1 bg-secondary rounded-full h-1.5">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <span className="text-muted-foreground min-w-0 flex-shrink-0">
                  {progress.progress}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Preview */}
      {uploadedMedia.length > 0 && (
        <div className="px-4 py-2 border-b border-border">
          <div className="flex gap-2 flex-wrap">
            {uploadedMedia.map((media, index) => (
              <div key={index} className="relative group">
                {media.type === 'image' ? (
                  <img 
                    src={media.url} 
                    alt="" 
                    className="w-16 h-16 object-cover rounded border"
                  />
                ) : media.type === 'video' ? (
                  <video 
                    src={media.url} 
                    className="w-16 h-16 object-cover rounded border"
                    muted
                  />
                ) : (
                  <div className="w-16 h-16 bg-secondary rounded border flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="relative">
        <div className="flex items-center gap-1 px-2 py-1">
          {/* 1. Suggestions Button with Badge */}
          <div className="relative">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              disabled={isLoading}
              aria-label="Vorschläge"
              className="w-11 h-11 flex items-center justify-center"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            
            {/* Suggestions Badge */}
            {suggestions.length > 0 && (
              <span className="absolute -top-0.5 -right-1.5 text-[10px] font-bold text-white bg-gray-500 rounded-full px-1">
                {Math.min(suggestions.length, 4)}
              </span>
            )}
          </div>

          {/* 2. Tool Picker */}
          <div className="relative">
            <button
              onClick={() => setShowTools(!showTools)}
              disabled={isLoading}
              aria-label="Tools"
              className="w-11 h-11 flex items-center justify-center"
            >
              <Wrench className="w-6 h-6" />
            </button>
            
            {/* Tool indicator */}
            {pendingTools.length > 0 && (
              <span className="absolute -top-0.5 -right-1.5 text-[10px] font-bold text-white bg-primary rounded-full px-1">
                {pendingTools.length}
              </span>
            )}
          </div>

          {/* 3. Plus Button (Native File Picker) */}
          <button
            onClick={handlePlusClick}
            disabled={isLoading}
            aria-label="Datei hinzufügen"
            className="w-11 h-11 flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>

          {/* Input Field Container */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={isLoading}
              className={cn(
                "w-full resize-none border-0 bg-transparent p-3 text-sm",
                "placeholder:text-muted-foreground focus:outline-none",
                "min-h-[44px] max-h-[200px]"
              )}
              rows={1}
            />
          </div>

          {/* 4. Microphone Button (Red) */}
          <button
            onClick={handleVoiceToggle}
            disabled={isLoading}
            aria-label="Spracheingabe"
            className="w-11 h-11 flex items-center justify-center text-red-600"
          >
            <Mic className="w-6 h-6" />
          </button>

          {/* 5. Send Button */}
          <button
            onClick={handleSend}
            disabled={isLoading || (!inputText.trim() && uploadedMedia.length === 0)}
            aria-label="Senden"
            className="w-11 h-11 flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Tools Selection Panel */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border p-4"
          >
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map((tool) => (
                <motion.button
                  key={tool.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleToolSelect(tool.id)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                    pendingTools.some(pt => pt.tool === tool.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/30 hover:bg-secondary/50 border-border"
                  )}
                >
                  <tool.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tool.name}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10"
          >
            <div className="p-2">
              <p className="text-xs text-muted-foreground mb-2 px-2">Vorschläge:</p>
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full text-left p-2 text-sm hover:bg-secondary rounded transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Recording Overlay 2.1 */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 bottom-0 top-16 bg-background/85 backdrop-blur-sm flex flex-col items-center z-50 dark:bg-background/85"
          >
            {/* Timer + Waveform */}
            <div className="mt-12 flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">Recording...</span>
              <VoiceWaveAnimation isActive={isRecording} />
            </div>

            {/* Status Text */}
            <p className="mt-4 text-muted-foreground text-sm">
              {isRecording && 'Ich höre zu …'}
              {isProcessing && 'Text wird transkribiert …'}
            </p>

            {/* Action Bar */}
            <div className="mt-auto mb-8 flex gap-20">
              {/* Cancel Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVoiceCancel}
                className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center"
                aria-label="Aufnahme abbrechen"
              >
                <X className="w-8 h-8" />
              </motion.button>

              {/* Send Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVoiceSend}
                disabled={!hasCachedAudio && !isRecording}
                className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                aria-label="Transkribieren"
              >
                <ArrowUp className="w-8 h-8" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcribed Text Display */}
      {voiceText && !isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-0 right-0 bg-primary/10 border border-primary/20 rounded-t-lg p-3 -mt-1"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs text-primary font-medium mb-1">Transkribiert:</p>
              <p className="text-sm">{voiceText}</p>
            </div>
            <button
              onClick={clearTranscription}
              className="text-primary hover:text-primary/80 transition-colors"
              aria-label="Transkription löschen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};