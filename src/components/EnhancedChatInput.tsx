import React, { useState, useRef, useCallback } from 'react';
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
  Video
} from 'lucide-react';
import { toast } from 'sonner';
import { ToolPicker } from '@/components/ToolPicker';
import { MediaUploadZone } from '@/components/MediaUploadZone';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';
import { usePendingTools } from '@/hooks/usePendingTools';

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
  const handleToolSelect = useCallback((tool: string | null) => {
    if (tool) {
      addPendingTool({
        tool,
        label: tool,
        confidence: 1.0
      });
    } else {
      removePendingTool(selectedTool || '');
    }
  }, [addPendingTool, removePendingTool, selectedTool]);

  // Push system tool message for tool picker
  const pushSystemTool = useCallback((tool: string | null) => {
    // This would be implemented by the parent component if needed
  }, []);

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

  // Get mic button styles based on state
  const getMicButtonStyles = () => {
    if (isRecording) {
      return "bg-red-500 text-white hover:bg-red-600 animate-pulse";
    }
    if (isProcessing) {
      return "bg-yellow-500 text-white";
    }
    return "";
  };

  const hasContent = inputText.trim() || uploadedMedia.length > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Upload Progress */}
      {uploading && uploadProgress.length > 0 && (
        <Card className="p-3 space-y-2">
          <div className="text-sm font-medium">Upload läuft...</div>
          {uploadProgress.map((progress, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate flex-1">{progress.fileName}</span>
                <span>{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-1" />
            </div>
          ))}
        </Card>
      )}

      {/* Uploaded Media Preview */}
      {uploadedMedia.length > 0 && (
        <Card className="p-3">
          <div className="text-sm font-medium mb-2">Hochgeladene Medien ({uploadedMedia.length})</div>
          <div className="flex flex-wrap gap-2">
            {uploadedMedia.map((media, index) => (
              <div key={index} className="relative group">
                <Badge 
                  variant="secondary" 
                  className="flex items-center gap-1 pr-1"
                >
                  {media.type === 'image' ? (
                    <ImageIcon className="w-3 h-3" />
                  ) : (
                    <Video className="w-3 h-3" />
                  )}
                  <span className="text-xs">{media.type}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeMedia(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tool Selection Preview */}
      {selectedTool && (
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Tool ausgewählt</Badge>
              <span className="text-sm font-medium">{selectedTool}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleToolSelect(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      )}

      {/* Media Upload Zone */}
      {showMediaUpload && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Dateien hochladen</h3>
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
        </Card>
      )}

      {/* Main Input Area */}
      <div className="flex gap-2 items-end">
        {/* Tool Picker */}
        <ToolPicker
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
          pushSystemTool={pushSystemTool}
        />
        
        {/* Upload Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowMediaUpload(!showMediaUpload)}
          className={`flex-shrink-0 transition-all duration-200 ${
            showMediaUpload ? 'bg-primary text-primary-foreground' : ''
          }`}
          disabled={isLoading}
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="min-h-[60px] resize-none pr-12"
            disabled={isLoading}
          />
          
          {/* Voice Recording Button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleVoiceToggle}
            disabled={isLoading}
            className={`absolute right-2 bottom-2 h-8 w-8 ${getMicButtonStyles()}`}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          
          {/* Audio Level Indicator */}
          {isRecording && audioLevel > 0 && (
            <div className="absolute right-12 bottom-3 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 bg-red-500 rounded-full transition-all duration-100 ${
                    audioLevel > (i + 1) * 20 ? 'opacity-100' : 'opacity-30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!hasContent || isLoading}
          size="icon"
          className="flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Voice Transcription Display */}
      {transcribedText && (
        <Card className="p-2 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <div className="text-xs text-green-700 dark:text-green-300 mb-1">
            Transkribiert:
          </div>
          <div className="text-sm">{transcribedText}</div>
        </Card>
      )}
    </div>
  );
};