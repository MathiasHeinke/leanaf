
// Safe JSON parsing utilities to prevent crashes
export const safeJsonParse = <T = any>(jsonString: string | null | undefined, fallback: T): T => {
  if (!jsonString || jsonString === 'null' || jsonString === 'undefined') {
    return fallback;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (error) {
    console.warn('JSON parsing failed:', error, 'Input:', jsonString);
    return fallback;
  }
};

export const safeStringify = (obj: any, fallback: string = '[]'): string => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('JSON stringify failed:', error);
    return fallback;
  }
};

// Safe property access with fallback
export const safeGet = <T>(obj: any, key: string, fallback: T): T => {
  try {
    return obj && obj[key] !== null && obj[key] !== undefined ? obj[key] : fallback;
  } catch (error) {
    console.warn('Safe property access failed:', error);
    return fallback;
  }
};
