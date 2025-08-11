import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authorization } } }
    );

    // Clean up duplicate assistant messages with the generic "already answered" text
    const { data: duplicates, error: findError } = await supabase
      .from("coach_conversations")
      .select("id, conversation_id, message_content, created_at")
      .eq("message_role", "assistant")
      .like("message_content", "%ich habe dir bereits geantwortet%")
      .order("created_at", { ascending: false });

    if (findError) {
      throw findError;
    }

    let deletedCount = 0;
    
    if (duplicates && duplicates.length > 0) {
      // Group by conversation and keep only the latest one per conversation
      const grouped = duplicates.reduce((acc: any, msg: any) => {
        if (!acc[msg.conversation_id] || new Date(msg.created_at) > new Date(acc[msg.conversation_id].created_at)) {
          acc[msg.conversation_id] = msg;
        }
        return acc;
      }, {});

      // Delete all but the latest per conversation
      const toDelete = duplicates.filter(msg => 
        msg.id !== grouped[msg.conversation_id]?.id
      );

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("coach_conversations")
          .delete()
          .in("id", toDelete.map(m => m.id));

        if (deleteError) {
          throw deleteError;
        }
        
        deletedCount = toDelete.length;
      }
    }

    // Clean up old client_events (older than 7 days)
    const cleanupResult = await supabase.rpc('cleanup_old_client_events');

    return new Response(
      JSON.stringify({
        success: true,
        duplicates_cleaned: deletedCount,
        old_events_cleaned: cleanupResult.data || 0,
        message: `Cleaned up ${deletedCount} duplicate messages and ${cleanupResult.data || 0} old client events`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
