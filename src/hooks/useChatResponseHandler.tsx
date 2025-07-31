import { useState, useCallback } from 'react';

interface ResponseAnalysis {
  isLong: boolean;
  isStructured: boolean;
  wordCount: number;
  shouldTruncate: boolean;
}

interface ChatResponseHandlerOptions {
  maxWords?: number;
  structuredDataThreshold?: number;
}

export const useChatResponseHandler = (options: ChatResponseHandlerOptions = {}) => {
  const { maxWords = 150, structuredDataThreshold = 3 } = options;
  const [showFullResponse, setShowFullResponse] = useState(false);

  const analyzeResponse = useCallback((text: string): ResponseAnalysis => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Check for structured content indicators
    const hasLists = /[-•*]\s/.test(text) || /\d+\.\s/.test(text);
    const hasTables = text.includes('|') || /\s{2,}/.test(text);
    const hasMultipleParagraphs = text.split('\n\n').length > 2;
    
    const isStructured = hasLists || hasTables || hasMultipleParagraphs;
    const isLong = words.length > maxWords;
    const shouldTruncate = isLong && sentences.length > structuredDataThreshold;

    return {
      isLong,
      isStructured,
      wordCount: words.length,
      shouldTruncate
    };
  }, [maxWords, structuredDataThreshold]);

  const truncateResponse = useCallback((text: string): string => {
    const sentences = text.split(/([.!?]+)/).filter(s => s.trim().length > 0);
    let truncated = '';
    let wordCount = 0;
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punctuation = sentences[i + 1] || '';
      const sentenceWords = sentence.trim().split(/\s+/).length;
      
      if (wordCount + sentenceWords > maxWords) {
        break;
      }
      
      truncated += sentence + punctuation;
      wordCount += sentenceWords;
      
      // Stop after 3 sentences max for UX guidelines
      if (i >= 4) break;
    }
    
    return truncated.trim();
  }, [maxWords]);

  const handleLongResponse = useCallback((text: string) => {
    const analysis = analyzeResponse(text);
    
    if (analysis.shouldTruncate && !showFullResponse) {
      return {
        displayText: truncateResponse(text),
        showMore: true,
        analysis
      };
    }
    
    return {
      displayText: text,
      showMore: false,
      analysis
    };
  }, [analyzeResponse, truncateResponse, showFullResponse]);

  const toggleFullResponse = useCallback(() => {
    setShowFullResponse(!showFullResponse);
  }, [showFullResponse]);

  const reset = useCallback(() => {
    setShowFullResponse(false);
  }, []);

  return {
    handleLongResponse,
    toggleFullResponse,
    showFullResponse,
    reset
  };
};