import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  Loader2, 
  Mic, 
  MessageSquare
} from 'lucide-react';
import { useVoiceOverlay } from '@/hooks/useVoiceOverlay';
import { VoiceOverlay } from '@/components/VoiceOverlay';
import { motion, AnimatePresence } from 'framer-motion';


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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);
  const { isVoiceOverlayOpen, openVoiceOverlay, closeVoiceOverlay } = useVoiceOverlay();
  

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedOutsideSuggestions = suggestionsContainerRef.current && !suggestionsContainerRef.current.contains(target);
      if (clickedOutsideSuggestions && showSuggestions) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showSuggestions]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);


  // Handle voice recording
  const handleVoiceStart = useCallback(() => {
    openVoiceOverlay();
  }, [openVoiceOverlay]);

  // Handle voice text generated
  const handleVoiceTextGenerated = useCallback((text: string) => {
    const currentText = inputText;
    setInputText(currentText + (currentText ? ' ' : '') + text);
  }, [setInputText, inputText]);


  // Handle send message
  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  }, [inputText, onSendMessage, setInputText]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const hasContent = inputText.trim();

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>


      {/* Main Input Container */}
      <div className={`
        enhanced-chat-input-container bg-background/95 border border-border/40 transition-all duration-300 rounded-2xl shadow-lg backdrop-blur-sm relative
      `}>

        {/* Text Input Row - Full Width Above Buttons */}
        <div className="px-4 py-3 relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading || isVoiceOverlayOpen}
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
        </div>

        {/* Button Row - Input Bar with icon order: ① Suggestions ② Tool-Picker ③ Red Microphone ④ Send */}
        <div className="input-bar flex items-center justify-between px-4 py-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            {/* ① Suggestions Button with Badge - 44x44pt touch target */}
            <div className="relative" ref={suggestionsContainerRef}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowSuggestions(!showSuggestions);
                }}
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


          </div>

          {/* Right Side: ③ Red Microphone + ④ Send Button */}
          <div className="flex items-center gap-1">
            {/* ③ Microphone Button - Red Color - 44x44pt touch target */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                handleVoiceStart();
                setShowSuggestions(false);
              }}
              className="w-11 h-11 p-0 transition-all duration-200 text-red-600 hover:text-red-700"
              aria-label="Spracheingabe starten"
            >
              <Mic className="w-6 h-6" />
            </Button>

            {/* ④ Send Button */}
            <Button
              onClick={() => {
                handleSend();
                setShowSuggestions(false);
              }}
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


        {/* Voice Overlay */}
        {isVoiceOverlayOpen && (
          <VoiceOverlay 
            onTextGenerated={handleVoiceTextGenerated}
            onClose={closeVoiceOverlay}
          />
        )}
      </div>

    </div>
  );
};