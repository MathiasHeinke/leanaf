import { useState, useEffect } from 'react';

export const useInputBarHeight = () => {
  const [height, setHeight] = useState(120);

  useEffect(() => {
    const updateHeight = () => {
      // Get the entire input container height, not just the button bar
      const inputContainer = document.querySelector('.enhanced-chat-input-container');
      if (inputContainer) {
        const rect = inputContainer.getBoundingClientRect();
        setHeight(rect.height);
      }
    };

    // Initial measurement
    updateHeight();

    // Set up ResizeObserver for dynamic height changes
    const resizeObserver = new ResizeObserver(updateHeight);
    const inputContainer = document.querySelector('.enhanced-chat-input-container');
    
    if (inputContainer) {
      resizeObserver.observe(inputContainer);
    }

    // Fallback with window resize listener
    window.addEventListener('resize', updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return height;
};