import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Mic, Plus, Wrench, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';
import { motion, AnimatePresence } from 'framer-motion';

// Tool configuration 
const TOOLS = [
  { id: "gewicht", name: "Gewicht", color: "violet" },
  { id: "mahlzeit", name: "Mahlzeit", color: "orange" },
  { id: "uebung", name: "Training", color: "sky" },
  { id: "supplement", name: "Supplements", color: "green" },
  { id: "trainingsplan", name: "Trainingsplan", color: "purple" },
  { id: "diary", name: "Tagebuch", color: "pink" },
];

interface ModernChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: (message: string, mediaUrls?: string[], selectedTool?: string | null) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const ModernChatInput: React.FC<ModernChatInputProps> = ({
  inputText,
  setInputText,
  onSendMessage,
  isLoading,
  placeholder = "Nachricht eingeben …"
}) => {
  const [showTools, setShowTools] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Voice recording hook
  const { 
    isRecording, 
    isProcessing, 
    audioLevel, 
    startRecording, 
    stopRecording, 
    transcribedText,
    clearTranscription
  } = useEnhancedVoiceRecording();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

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
    if (activeTool === toolId) {
      setActiveTool(null);
    } else {
      setActiveTool(toolId);
    }
    setShowTools(false);
  }, [activeTool]);

  // Handle send message
  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    
    onSendMessage(inputText, [], activeTool);
    
    // Reset everything
    setInputText('');
    setActiveTool(null);
    clearTranscription();
  }, [inputText, activeTool, onSendMessage, setInputText, clearTranscription]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const hasContent = inputText.trim();
  const activeToolConfig = TOOLS.find(tool => tool.id === activeTool);

  return (
    <div className="space-y-3">
      {/* Textarea - eigener Bereich mit voller Breite */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
          className={`
            w-full h-16 resize-none py-2 px-3 bg-transparent outline-none rounded-lg border transition-colors
            ${activeToolConfig?.color === 'orange' 
              ? 'border-orange-500 focus:border-orange-500' 
              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
            }
          `}
        />
      </div>

      {/* Button-Leiste unter dem Textarea */}
      <div className="flex items-center justify-between">
        {/* Linke Seite: Tool-Buttons */}
        <div className="flex items-center space-x-2">
          {/* Tool-Picker Button */}
          <button
            onClick={() => setShowTools(!showTools)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
            disabled={isLoading}
          >
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Wrench Icon */}
          <button
            onClick={() => { setActiveTool('settings'); setShowTools(true); }}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            <Wrench className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Rechte Seite: Mic + Send */}
        <div className="flex items-center space-x-2">
          {/* Mic Button */}
          <button
            onClick={handleVoiceToggle}
            className={`p-2 rounded-full transition-colors ${
              isRecording 
                ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            disabled={isLoading}
          >
            <Mic className={`w-5 h-5 ${isRecording ? 'text-red-500' : 'text-red-500'}`} />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!hasContent || isLoading}
            className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Tool-Picker Popover - Position angepasst */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.2 }}
            className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-2 flex space-x-2 z-50"
          >
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                className={`
                  p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                  ${activeTool === tool.id ? 'bg-blue-100 dark:bg-blue-900' : ''}
                `}
              >
                <span className="capitalize text-sm">{tool.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Overlay - über den gesamten Bereich */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center space-y-4 rounded-lg z-50"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-white"
            >
              <Mic className="w-12 h-12" />
            </motion.div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => stopRecording()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => stopRecording()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Senden
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};