import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Paperclip, 
  Mic, 
  MicOff, 
  X, 
  Image as ImageIcon,
  Video,
  Wrench,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AudioWaveform
} from 'lucide-react';
import { toast } from 'sonner';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';
import { usePendingTools } from '@/hooks/usePendingTools';
import { motion, AnimatePresence } from 'framer-motion';

// Tool configuration with colors
const TOOLS = [
  { id: "gewicht", name: "Gewicht", color: "violet", borderColor: "border-violet-500", bgColor: "bg-violet-500" },
  { id: "mahlzeit", name: "Mahlzeit", color: "orange", borderColor: "border-orange-400", bgColor: "bg-orange-400" },
  { id: "uebung", name: "Training", color: "sky", borderColor: "border-sky-400", bgColor: "bg-sky-400" },
  { id: "supplement", name: "Supplements", color: "green", borderColor: "border-green-400", bgColor: "bg-green-400" },
  { id: "trainingsplan", name: "Trainingsplan", color: "purple", borderColor: "border-purple-500", bgColor: "bg-purple-500" },
  { id: "diary", name: "Tagebuch", color: "pink", borderColor: "border-pink-400", bgColor: "bg-pink-400" },
];

interface EnhancedChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: (message: string, mediaUrls?: string[], selectedTool?: string | null) => void;
  isLoading: boolean;
  placeholder?: string;
  className?: string;
}

export const EnhancedChatInput: React.FC<EnhancedChatInputProps> = ({
  inputText,
  setInputText,
  onSendMessage,
  isLoading,
  placeholder = "Nachricht eingeben...",
  className = ""
}) => {
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<Array<{url: string, type: 'image' | 'video'}>>([]);
  const [showTools, setShowTools] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Hooks
  const { uploadFiles, uploading, uploadProgress, getMediaType } = useMediaUpload();
  const { 
    isRecording, 
    isProcessing, 
    audioLevel, 
    startRecording, 
    stopRecording, 
    transcribedText,
    clearTranscription
  } = useEnhancedVoiceRecording();
  
  const { 
    pendingTools, 
    addPendingTool, 
    removePendingTool 
  } = usePendingTools();

  const selectedTool = pendingTools[0]?.tool || null;
  const selectedToolConfig = TOOLS.find(tool => tool.id === selectedTool);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Handle media upload - simplified to match MediaUploadZone interface
  const handleMediaUpload = useCallback((urls: string[]) => {
    const newMedia = urls.map(url => {
      const mediaType = getMediaType(url);
      return {
        url,
        type: mediaType === 'unknown' ? 'image' : mediaType as 'image' | 'video'
      };
    });
    setUploadedMedia(prev => [...prev, ...newMedia]);
    setShowMediaUpload(false);
    toast.success(`${urls.length} Datei(en) hochgeladen`);
  }, [getMediaType]);

  // Handle voice recording
  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      const result = await stopRecording();
      if (result) {
        setInputText(inputText + (inputText ? ' ' : '') + result);
      }
    } else {
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording, setInputText, inputText]);

  // Handle tool selection
  const handleToolSelect = useCallback((toolId: string) => {
    if (selectedTool === toolId) {
      // Deselect if already selected
      removePendingTool(toolId);
    } else {
      // Remove current tool and select new one
      if (selectedTool) {
        removePendingTool(selectedTool);
      }
      addPendingTool({
        tool: toolId,
        label: toolId,
        confidence: 1.0
      });
    }
    setShowTools(false);
  }, [addPendingTool, removePendingTool, selectedTool]);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle send message
  const handleSend = useCallback(() => {
    if (!inputText.trim() && uploadedMedia.length === 0) return;
    
    const mediaUrls = uploadedMedia.map(media => media.url);
    onSendMessage(inputText, mediaUrls, selectedTool);
    
    // Reset everything
    setInputText('');
    setUploadedMedia([]);
    if (selectedTool) {
      removePendingTool(selectedTool);
    }
    clearTranscription();
    setShowMediaUpload(false);
  }, [inputText, uploadedMedia, selectedTool, onSendMessage, setInputText, removePendingTool, clearTranscription]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Remove uploaded media
  const removeMedia = useCallback((index: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== index));
  }, []);

  const hasContent = inputText.trim() || uploadedMedia.length > 0;

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* History Banner */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 80, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="mb-3 overflow-hidden"
          >
            <div className="bg-zinc-100/90 dark:bg-zinc-800/90 rounded-xl px-4 py-3 backdrop-blur-sm border border-border/50 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 text-sm md:text-base text-muted-foreground leading-snug">
                  <div className="font-semibold">Heute: "Hallo! Wie geht's dir heute?" 💪</div>
                  <div className="text-xs opacity-75">Gestern: "Wie war dein Training?"</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Heutigen Verlauf löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowHistory(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress */}
      {uploading && uploadProgress.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <div className="bg-background/95 border border-border rounded-xl p-4 shadow-lg backdrop-blur-sm">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Upload läuft...
            </div>
            <div className="space-y-3">
              {uploadProgress.map((progress, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="truncate flex-1 font-medium">{progress.fileName}</span>
                    <span className="text-primary font-semibold">{progress.progress}%</span>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Uploaded Media Preview */}
      {uploadedMedia.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <div className="bg-background/95 border border-border rounded-xl p-4 shadow-lg backdrop-blur-sm">
            <div className="text-sm font-medium mb-3">📎 Hochgeladene Medien ({uploadedMedia.length})</div>
            <div className="flex flex-wrap gap-2">
              {uploadedMedia.map((media, index) => (
                <div key={index} className="relative group">
                  <Badge 
                    variant="secondary" 
                    className="flex items-center gap-2 pr-1 py-1 bg-primary/10 text-primary border-primary/20"
                  >
                    {media.type === 'image' ? (
                      <ImageIcon className="w-3 h-3" />
                    ) : (
                      <Video className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium">{media.type}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tool Selection Preview */}
      {selectedToolConfig && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <div className={`bg-background/95 border-2 ${selectedToolConfig.borderColor} rounded-xl p-3 shadow-lg backdrop-blur-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 ${selectedToolConfig.bgColor} rounded-full`}></div>
                <span className="text-sm font-medium">🔧 {selectedToolConfig.name} aktiv</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removePendingTool(selectedTool!)}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Media Upload Zone */}
      <AnimatePresence>
        {showMediaUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="mb-3 overflow-hidden"
          >
            <div className="bg-background/95 border border-border rounded-xl p-4 shadow-lg backdrop-blur-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">📁 Dateien hochladen</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMediaUpload(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <MediaUploadZone
                onMediaUploaded={handleMediaUpload}
                accept={['image/*', 'video/*']}
                maxFiles={5}
                className="min-h-[120px]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Container */}
      <div className={`
        bg-background/95 border-2 transition-all duration-300 rounded-2xl shadow-lg backdrop-blur-sm
        ${selectedToolConfig ? selectedToolConfig.borderColor : 'border-border hover:border-primary/50'}
        ${isRecording ? 'border-red-500 shadow-red-500/20' : ''}
      `}>
        {/* Top Row - History Toggle and Controls */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showHistory ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            Verlauf
          </Button>
          <div className="text-xs text-muted-foreground">
            {selectedToolConfig && `🔧 ${selectedToolConfig.name}`}
          </div>
        </div>

        {/* Input Row */}
        <div className="flex items-end gap-3 p-4">
          {/* Tool Picker */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowTools(!showTools)}
              className={`transition-all duration-200 ${selectedTool ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Wrench className={`w-5 h-5 transition-transform duration-200 ${showTools ? 'rotate-45' : ''}`} />
            </Button>
            
            {/* Tool Selection Dropdown */}
            <AnimatePresence>
              {showTools && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: "spring", duration: 0.2 }}
                  className="absolute bottom-full mb-2 left-0 z-50"
                >
                  <div className="bg-background border border-border rounded-xl p-2 shadow-xl backdrop-blur-sm min-w-[200px]">
                    <div className="grid grid-cols-2 gap-2">
                      {TOOLS.map(tool => (
                        <Button
                          key={tool.id}
                          size="sm"
                          variant={selectedTool === tool.id ? "default" : "ghost"}
                          onClick={() => handleToolSelect(tool.id)}
                          className={`
                            justify-start font-medium transition-all duration-200
                            ${selectedTool === tool.id 
                              ? `${tool.bgColor} text-white shadow-lg hover:opacity-90` 
                              : 'hover:bg-accent hover:text-accent-foreground'
                            }
                          `}
                        >
                          <div className={`w-2 h-2 ${tool.bgColor} rounded-full mr-2 ${selectedTool === tool.id ? 'bg-white/30' : ''}`}></div>
                          {tool.name}
                        </Button>
                      ))}
                    </div>
                    {selectedTool && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePendingTool(selectedTool)}
                          className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Tool entfernen
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Additional Actions Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowMediaUpload(!showMediaUpload)}
            className={`transition-all duration-200 ${showMediaUpload ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            disabled={isLoading}
          >
            <Plus className="w-5 h-5" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={isLoading}
              className={`
                w-full bg-transparent border-none outline-none resize-none
                text-base md:text-lg leading-normal px-4 py-3
                placeholder:text-zinc-400 dark:placeholder:text-zinc-500 
                text-zinc-800 dark:text-white font-medium
                transition-all duration-200
              `}
              style={{ 
                minHeight: 48, 
                maxHeight: 120,
                overflow: 'auto',
                fontSize: '18px',
                lineHeight: '1.6',
                fontFamily: 'InterVariable, Inter, -apple-system, sans-serif'
              }}
            />
          </div>

          {/* Voice Recording Button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleVoiceToggle}
            disabled={isLoading}
            className={`
              transition-all duration-200 flex-shrink-0
              ${isRecording 
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-lg' 
                : isProcessing 
                  ? 'bg-yellow-500 text-white animate-pulse' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }
            `}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!hasContent || isLoading}
            size="icon"
            className={`
              flex-shrink-0 transition-all duration-200 shadow-lg
              ${hasContent && !isLoading 
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                : 'opacity-50'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Voice Recording Overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
          >
            <div className="text-center space-y-6">
              {/* Animated Waveform */}
              <div className="relative">
                <AudioWaveform className="w-16 h-16 text-red-400 animate-pulse" />
                {audioLevel > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="w-20 h-20 rounded-full border-2 border-red-400 animate-ping opacity-30"
                      style={{ 
                        transform: `scale(${1 + audioLevel / 100})`,
                        transition: 'transform 0.1s ease-out' 
                      }}
                    />
                  </div>
                )}
              </div>
              
              {/* Recording Time */}
              <div className="text-white text-lg font-mono">
                🎤 {formatTime(recordingTime)}
              </div>
              
              {/* Audio Level Bars */}
              <div className="flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-8 bg-red-400 rounded-full transition-all duration-100 ${
                      audioLevel > (i + 1) * 20 ? 'opacity-100' : 'opacity-30'
                    }`}
                    style={{
                      height: audioLevel > (i + 1) * 20 ? `${20 + (audioLevel / 5)}px` : '20px'
                    }}
                  />
                ))}
              </div>
              
              {/* Control Buttons */}
              <div className="flex gap-6 mt-8">
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => {
                    stopRecording();
                    clearTranscription();
                  }}
                  className="px-8 py-3 text-base font-medium"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={handleVoiceToggle}
                  className="px-8 py-3 text-base font-medium bg-primary hover:bg-primary/90"
                >
                  Absenden
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Transcription Display */}
      <AnimatePresence>
        {transcribedText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-3"
          >
            <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-xl p-3 backdrop-blur-sm">
              <div className="text-xs text-green-700 dark:text-green-300 mb-2 font-medium">
                🎤 Transkribiert:
              </div>
              <div className="text-sm text-green-900 dark:text-green-100">{transcribedText}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};