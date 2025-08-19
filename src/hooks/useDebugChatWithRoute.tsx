import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useDebugChatWithRoute = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { coachId: routeCoachId } = useParams();

  const sendDebug = async ({ 
    message, 
    coachId,
    model = "gpt-4.1-2025-04-14"
  }: {
    message: string; 
    coachId?: string;
    model?: string;
  }) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    // Use route coach ID if no specific coach provided
    const effectiveCoachId = coachId || routeCoachId || "lucy";

    setLoading(true);
    try {
      console.log(`🔧 Debug-Chat: Sending to ${effectiveCoachId} via ${model}...`);
      console.log("🔧 Payload:", { 
        userId: user.id, 
        message: message.substring(0, 50) + "...", 
        coachId: effectiveCoachId, 
        model 
      });
      
      const { data, error } = await supabase.functions.invoke("debug-direct-chat", {
        body: { 
          userId: user.id, 
          message, 
          coachId: effectiveCoachId,
          model
        },
      });
      
      console.log("🔧 Raw response from debug-direct-chat:", { data, error });
      
      if (error) {
        console.error("🔧 Debug-Chat Error:", error);
        throw new Error(`Debug function error: ${error.message || error}`);
      }
      
      if (!data) {
        throw new Error("No data received from debug function");
      }

      // Enhanced response with metadata
      const enhancedData = {
        ...data,
        metadata: {
          coachId: effectiveCoachId,
          model,
          source: 'debug',
          pipeline: 'direct',
          ...data.debug // Include any debug info from the response
        }
      };
      
      console.log("🔧 Debug-Chat Success with metadata:", enhancedData);
      return enhancedData;
    } catch (err) {
      console.error("🔧 Debug-Chat Failed:", err);
      throw err;
    } finally { 
      setLoading(false); 
    }
  };

  return { sendDebug, loading, currentCoach: routeCoachId || "lucy" };
};