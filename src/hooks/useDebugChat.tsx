import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useDebugChat = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const sendDebug = async ({ 
    message, 
    coachId = "lucy",
    model = "gpt-4.1-2025-04-14"
  }: {
    message: string; 
    coachId?: string;
    model?: string;
  }) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    setLoading(true);
    try {
      console.log(`🔧 Debug-Chat: Sending direct to ${model}...`);
      console.log("🔧 Payload:", { userId: user.id, message: message.substring(0, 50) + "...", coachId, model });
      console.log("🔧 About to call supabase.functions.invoke...");
      
      const { data, error } = await supabase.functions.invoke("debug-direct-chat", {
        body: { 
          userId: user.id, 
          message, 
          coachId,
          model
        },
      });
      
      console.log("🔧 Raw response from supabase.functions.invoke:", { data, error });
      
      if (error) {
        console.error("🔧 Debug-Chat Error:", error);
        throw new Error(`Debug function error: ${error.message || error}`);
      }
      
      if (!data) {
        throw new Error("No data received from debug function");
      }
      
      console.log("🔧 Debug-Chat Success:", data);
      return data; // { role:'assistant', content:'...', debug: {...} }
    } catch (err) {
      console.error("🔧 Debug-Chat Failed:", err);
      throw err;
    } finally { 
      setLoading(false); 
    }
  };

  return { sendDebug, loading };
};