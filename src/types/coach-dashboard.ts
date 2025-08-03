export interface DashboardRow {
  conversation_id: string;
  coach: string;
  user_id: string;
  started_at: string;
  last_msg_at: string;
  user_msgs: number;
  coach_msgs: number;
  used_tool: boolean;
  used_rag: boolean;
  tool_list: string[];
  admin_status: 'open' | 'reviewed' | 'archived' | null;
  plan_count: number;
}

export interface ConvMessage {
  id: string;
  message_role: 'user' | 'assistant';
  message_content: string;
  created_at: string;
  coach_personality: string;
  context_data?: Record<string, any>;
}

export interface ToolEvent {
  id: string;
  conversation_id: string;
  tool: string;
  source: 'auto' | 'manual';
  confidence: number;
  is_applied: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface RagEvent {
  id: string;
  conversation_id: string;
  chunk_id: string | null;
  score: number | null;
  source_doc: string | null;
  content_snippet: string | null;
  created_at: string;
}

export interface CoachPlan {
  id: string;
  conversation_id: string;
  type: 'training' | 'nutrition' | 'supplement';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  title: string | null;
  json_payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  messages: ConvMessage[];
  rag: RagEvent[];
  tools: ToolEvent[];
  plans: CoachPlan[];
}

export interface DashboardFilters {
  from?: Date;
  to?: Date;
  coach?: string;
  status?: string;
  tool?: string;
  hasRag?: boolean;
}

export interface AdminNote {
  id: string;
  conversation_id: string;
  admin_user_id: string;
  note: string;
  status: 'open' | 'reviewed' | 'archived';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}