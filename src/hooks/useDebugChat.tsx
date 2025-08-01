import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useDebugChat = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const sendDebug = async ({ 
    message, 
    coachId = "lucy" 
  }: {
    message: string; 
    coachId?: string;
  }) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    setLoading(true);
    try {
      console.log("🔧 Debug-Chat: Sending direct to GPT-4.1...");
      
      const { data, error } = await supabase.functions.invoke("debug-direct-chat", {
        body: { 
          userId: user.id, 
          message, 
          coachId 
        },
      });
      
      if (error) {
        console.error("🔧 Debug-Chat Error:", error);
        throw error;
      }
      
      console.log("🔧 Debug-Chat Success:", data);
      return data; // { role:'assistant', content:'...', debug: {...} }
    } finally { 
      setLoading(false); 
    }
  };

  return { sendDebug, loading };
};