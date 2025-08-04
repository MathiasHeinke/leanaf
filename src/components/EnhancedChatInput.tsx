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
  AudioWaveform,
  Scale,
  UtensilsCrossed,
  BookOpen,
  Pill,
  Dumbbell,
  PenTool,
  MessageSquare
} from 'lucide-react';
import { VoiceCanvasWaveform } from '@/components/VoiceCanvasWaveform';
import { useInputBarHeight } from '@/hooks/useInputBarHeight';
import { toast } from 'sonner';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';
import { usePendingTools } from '@/hooks/usePendingTools';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Tool configuration with colors
const TOOLS = [
  { id: "gewicht", name: "Gewicht", color: "violet", borderColor: "border-violet-500", bgColor: "bg-violet-500", textColor: "text-violet-500", icon: Scale },
  { id: "mahlzeit", name: "Mahlzeit", color: "orange", borderColor: "border-orange-400", bgColor: "bg-orange-400", textColor: "text-orange-400", icon: UtensilsCrossed },
  { id: "uebung", name: "Training", color: "sky", borderColor: "border-sky-400", bgColor: "bg-sky-400", textColor: "text-sky-400", icon: BookOpen },
  { id: "supplement", name: "Supplements", color: "green", borderColor: "border-green-400", bgColor: "bg-green-400", textColor: "text-green-400", icon: Pill },
  { id: "trainingsplan", name: "Trainingsplan", color: "purple", borderColor: "border-purple-500", bgColor: "bg-purple-500", textColor: "text-purple-500", icon: Dumbbell },
  { id: "diary", name: "Tagebuch", color: "pink", borderColor: "border-pink-400", bgColor: "bg-pink-400", textColor: "text-pink-400", icon: PenTool },
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get input bar height for overlay
  const inputBarHeight = useInputBarHeight();
  
  // Hooks
  const { uploadFiles, uploading, uploadProgress, getMediaType } = useMediaUpload();
  const { 
    isRecording, 
    isProcessing, 
    audioLevel, 
    startRecording, 
    stopRecording, 
    transcribedText,
    clearTranscription,
    sendTranscription,
    hasCachedAudio
  } = useEnhancedVoiceRecording();
  
  const { 
    pendingTools, 
    addPendingTool, 
    removePendingTool 
  } = usePendingTools();

  const selectedTool = pendingTools[0]?.tool || null;
  const selectedToolConfig = TOOLS.find(tool => tool.id === selectedTool);

  // Get suggestions for current context - max 4 as per spec
  const getSuggestions = () => {
    const allSuggestions = [
      "Wie kann ich meine Fitness verbessern?",
      "Was ist eine ausgewogene Ernährung?", 
      "Zeig mir einen Trainingsplan",
      "Wie bleibe ich motiviert?"
    ];
    return allSuggestions.slice(0, 4); // Max 4 as per specification
  };

  const suggestionCount = getSuggestions().length;

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
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

  // Handle voice recording - start/stop only, no auto-send
  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording]);

  // Handle voice cancel
  const handleVoiceCancel = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    clearTranscription();
  }, [isRecording, stopRecording, clearTranscription]);

  // Handle voice send
  const handleVoiceSend = useCallback(async () => {
    const result = await sendTranscription();
    if (result) {
      setInputText(inputText + (inputText ? ' ' : '') + result);
    }
  }, [sendTranscription, setInputText, inputText]);

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
        bg-background/95 border transition-all duration-300 rounded-2xl shadow-lg backdrop-blur-sm relative
        ${selectedToolConfig ? selectedToolConfig.borderColor : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}
        ${isRecording ? 'border-red-500 shadow-red-500/20' : ''}
      `}>

        {/* Text Input Row - Full Width Above Buttons */}
        <div className="px-4 py-3 relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className={`
              w-full bg-transparent resize-none outline-none
              text-base md:text-lg leading-normal px-4 py-3 pr-24
              placeholder:text-zinc-400 dark:placeholder:text-zinc-500 
              text-zinc-800 dark:text-white font-medium
              transition-all duration-200
            `}
            style={{ 
              minHeight: 80, 
              maxHeight: 200,
              overflow: 'auto',
              fontSize: '18px',
              lineHeight: '1.6',
              fontFamily: 'InterVariable, Inter, -apple-system, sans-serif'
            }}
          />
          {/* Tool Status in top-right of textarea */}
          {selectedToolConfig && (
            <div className="absolute top-2 right-2 flex items-center gap-1 text-xs font-medium">
              <div className={`w-2 h-2 ${selectedToolConfig.bgColor} rounded-full`}></div>
              <Wrench className={`w-3 h-3 ${selectedToolConfig.textColor}`} />
              <span className="text-muted-foreground">{selectedToolConfig.name}</span>
            </div>
          )}
        </div>

        {/* Button Row - Input Bar with exact icon order: ① Suggestions ② Tool-Picker ③ Plus ④ Red Microphone ⑤ Send */}
        <div className="input-bar flex items-center justify-between px-4 py-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            {/* ① Suggestions Button with Badge - 44x44pt touch target */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="w-11 h-11 p-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
                aria-label="Gesprächsvorschläge anzeigen"
              >
                <MessageSquare className="w-6 h-6" />
                {suggestionCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {suggestionCount}
                  </span>
                )}
              </Button>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: "spring", duration: 0.2 }}
                    className="absolute bottom-full mb-2 left-0 z-50"
                  >
                    <div className="bg-background border border-border rounded-xl p-3 shadow-xl backdrop-blur-sm w-80">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          💡 Gesprächsvorschläge
                        </h3>
                        <div className="space-y-2">
                          {getSuggestions().map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setInputText(suggestion);
                                setShowSuggestions(false);
                              }}
                              className="w-full justify-start text-left h-auto p-3 whitespace-normal hover:bg-accent hover:text-accent-foreground"
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ② Tool Picker - 44x44pt touch target */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowTools(!showTools)}
                className={`
                  w-11 h-11 p-0 transition-all duration-200 
                  ${selectedTool ? selectedToolConfig?.textColor : 'text-muted-foreground hover:text-foreground'}
                `}
                aria-label="Werkzeuge auswählen"
              >
                <Wrench className={`w-6 h-6 transition-transform duration-200 ${showTools ? 'rotate-45' : ''}`} />
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
                    <div className="bg-background border border-border rounded-xl p-2 shadow-xl backdrop-blur-sm w-56">
                      <div className="space-y-1">
                        {TOOLS.map(tool => {
                          const IconComponent = tool.icon;
                          return (
                            <Button
                              key={tool.id}
                              size="sm"
                              variant={selectedTool === tool.id ? "default" : "ghost"}
                              onClick={() => handleToolSelect(tool.id)}
                              className={`
                                w-full justify-between font-medium transition-all duration-200
                                ${selectedTool === tool.id 
                                  ? `${tool.bgColor} text-white shadow-lg hover:opacity-90` 
                                  : 'hover:bg-accent hover:text-accent-foreground'
                                }
                              `}
                            >
                              <span>{tool.name}</span>
                              <IconComponent className="w-4 h-4" />
                            </Button>
                          );
                        })}
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

            {/* ③ Plus Icon - Native File Picker - 44x44pt touch target */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowMediaUpload(!showMediaUpload)}
              className="w-11 h-11 p-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
              disabled={isLoading}
              aria-label="Medien hinzufügen"
            >
              <Plus className="w-6 h-6" />
            </Button>

            {/* ④ Red Microphone - 44x44pt touch target - iOS Alert Red #FF3B30 */}
            <Button
              type="button"
              variant="ghost"
              onClick={handleVoiceToggle}
              disabled={isLoading}
              className={`
                w-11 h-11 p-0 transition-all duration-200 flex-shrink-0
                ${isRecording 
                  ? 'bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90 animate-pulse shadow-lg' 
                  : 'text-[#FF3B30] hover:bg-[#FF3B30]/10'
                }
              `}
              aria-label={isRecording ? "Spracheingabe beenden" : "Spracheingabe starten"}
            >
              {isRecording ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>
          </div>

          {/* Right Side: ⑤ Send Button */}
          <div className="flex items-center">
            <Button
              onClick={handleSend}
              disabled={!hasContent || isLoading}
              className={`
                w-11 h-11 p-0 transition-all duration-200 font-medium
                ${hasContent && !isLoading
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg scale-100' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed scale-95'
                }
              `}
              aria-label="Nachricht senden"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Voice Recording Overlay - Enhanced v2.1 - Only covers input bar area */}
        <AnimatePresence>
          {(isRecording || isProcessing || hasCachedAudio) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-sm rounded-2xl z-50 pointer-events-none"
              style={{ height: inputBarHeight }}
            >
              <div className="flex flex-col items-center justify-center h-full p-6 pointer-events-auto">
                {/* Status Text */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-center">
                    {isRecording ? "Ich höre zu..." : 
                     isProcessing ? "Text wird transkribiert..." : 
                     "Aufnahme bereit"}
                  </p>
                  {isRecording && (
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {formatTime(recordingTime)}
                    </div>
                  )}
                </div>

                {/* Canvas Waveform Animation */}
                <div className="mb-6">
                  <VoiceCanvasWaveform 
                    audioLevel={audioLevel} 
                    isActive={isRecording || isProcessing}
                    width={120}
                    height={40}
                  />
                </div>

                {/* Action Buttons - 64x64px touch targets */}
                <div className="flex items-center justify-between w-full max-w-xs gap-4">
                  {/* Cancel Button - 64x64px */}
                  <Button
                    variant="ghost"
                    onClick={handleVoiceCancel}
                    className="w-16 h-16 flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm border border-border/50"
                    aria-label="Spracheingabe abbrechen"
                  >
                    <X className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Abbrechen</span>
                  </Button>

                  {/* Send/Transcribe Button - 64x64px */}
                  <Button
                    variant="default"
                    onClick={handleVoiceSend}
                    disabled={!hasCachedAudio || isProcessing}
                    className="w-16 h-16 flex flex-col items-center gap-1 bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90 shadow-lg"
                    aria-label="Spracheingabe transkribieren"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-[10px] font-medium">...</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Senden</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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