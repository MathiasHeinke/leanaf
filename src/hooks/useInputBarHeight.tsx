import { useState, useEffect } from 'react';

export const useInputBarHeight = () => {
  const [height, setHeight] = useState(60);

  useEffect(() => {
    const updateHeight = () => {
      const inputBar = document.querySelector('.input-bar');
      if (inputBar) {
        const rect = inputBar.getBoundingClientRect();
        setHeight(rect.height);
      }
    };

    // Initial measurement
    updateHeight();

    // Set up ResizeObserver for dynamic height changes
    const resizeObserver = new ResizeObserver(updateHeight);
    const inputBar = document.querySelector('.input-bar');
    
    if (inputBar) {
      resizeObserver.observe(inputBar);
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