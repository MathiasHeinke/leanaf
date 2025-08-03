import { supabase } from '@/integrations/supabase/client';

/**
 * MemoryManager - Rolling Conversation Memory System
 * Manages conversation packets with 10-message limit and OpenAI-based compression
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface MemoryPacket {
  id?: number;
  convo_id: string;
  from_msg: number;
  to_msg: number;
  message_count: number;
  packet_summary: string;
  created_at: string;
}

export interface ConversationMemory {
  convo_id: string;
  user_id: string;
  coach_id: string;
  last_messages: ChatMessage[];
  message_count: number;
  rolling_summary: string | null;
  created_at: string;
  updated_at: string;
}

export class MemoryManager {
  private readonly MESSAGE_LIMIT = 10;
  private readonly OPENAI_API_KEY: string;

  constructor() {
    // For edge functions, this will be set differently
    this.OPENAI_API_KEY = '';
  }

  /**
   * Load conversation memory for a specific coach-user pair
   */
  async loadConversationMemory(userId: string, coachId: string): Promise<ConversationMemory | null> {
    try {
      const { data, error } = await supabase
        .from('coach_chat_memory' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .maybeSingle();

      if (error) {
        console.error('Error loading conversation memory:', error);
        return null;
      }

      return data as unknown as ConversationMemory;
    } catch (error) {
      console.error('Error in loadConversationMemory:', error);
      return null;
    }
  }

  /**
   * Add new message and handle rolling memory
   */
  async addMessage(
    userId: string, 
    coachId: string, 
    message: ChatMessage
  ): Promise<{ memory: ConversationMemory; needsCompression: boolean }> {
    
    // Load or create conversation memory
    let memory = await this.loadConversationMemory(userId, coachId);
    
    if (!memory) {
      memory = await this.createNewConversation(userId, coachId);
    }

    // Add new message
    memory.last_messages.push(message);
    memory.message_count += 1;
    memory.updated_at = new Date().toISOString();

    const needsCompression = memory.last_messages.length > this.MESSAGE_LIMIT;

    // Save updated memory
    await this.saveConversationMemory(memory);

    return { memory, needsCompression };
  }

  /**
   * Compress old messages into summary packet
   */
  async compressMessages(memory: ConversationMemory, openAIApiKey?: string): Promise<ConversationMemory> {
    if (memory.last_messages.length <= this.MESSAGE_LIMIT) {
      return memory;
    }

    const apiKey = openAIApiKey || this.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('No OpenAI API key available for compression');
      // Fallback: simple truncation
      memory.last_messages = memory.last_messages.slice(-this.MESSAGE_LIMIT);
      await this.saveConversationMemory(memory);
      return memory;
    }

    try {
      // Take first 8 messages for compression, keep last 2
      const messagesToCompress = memory.last_messages.slice(0, -2);
      const recentMessages = memory.last_messages.slice(-2);

      // Generate summary using OpenAI
      const summary = await this.generateSummary(messagesToCompress, apiKey);

      // Create packet entry
      const packet: Omit<MemoryPacket, 'id'> = {
        convo_id: memory.convo_id,
        from_msg: Math.max(1, memory.message_count - messagesToCompress.length),
        to_msg: memory.message_count - 2,
        message_count: messagesToCompress.length,
        packet_summary: summary,
        created_at: new Date().toISOString()
      };

      // Save packet to database
      await this.savePacket(packet);

      // Update memory with compressed data
      memory.last_messages = recentMessages;
      memory.rolling_summary = summary;
      memory.updated_at = new Date().toISOString();

      await this.saveConversationMemory(memory);

      console.log(`✅ Compressed ${messagesToCompress.length} messages into summary`);
      return memory;

    } catch (error) {
      console.error('Error in compression:', error);
      // Fallback to simple truncation
      memory.last_messages = memory.last_messages.slice(-this.MESSAGE_LIMIT);
      await this.saveConversationMemory(memory);
      return memory;
    }
  }

  /**
   * Get conversation context for coach prompts
   */
  async getConversationContext(userId: string, coachId: string): Promise<{
    recentMessages: ChatMessage[];
    historicalSummary: string | null;
    messageCount: number;
  }> {
    
    const memory = await this.loadConversationMemory(userId, coachId);
    
    if (!memory) {
      return {
        recentMessages: [],
        historicalSummary: null,
        messageCount: 0
      };
    }

    // Get recent packet summaries for additional context
    const { data: recentPackets } = await supabase
      .from('coach_chat_packets' as any)
      .select('packet_summary, message_count')
      .eq('convo_id', memory.convo_id)
      .order('created_at', { ascending: false })
      .limit(3);

    const historicalSummary = recentPackets?.length 
      ? recentPackets.map((p: any) => p.packet_summary).join('\n\n') 
      : memory.rolling_summary;

    return {
      recentMessages: memory.last_messages,
      historicalSummary,
      messageCount: memory.message_count
    };
  }

  /**
   * Generate AI summary of messages
   */
  private async generateSummary(messages: ChatMessage[], apiKey: string): Promise<string> {
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Erstelle eine präzise Zusammenfassung des Gesprächs zwischen User und Coach. Fokussiere auf: Hauptthemen, Ziele, Fortschritte, wichtige Erkenntnisse. Maximal 200 Wörter, auf Deutsch.'
          },
          {
            role: 'user',
            content: `Fasse diese Unterhaltung zusammen:\n\n${conversation}`
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Gespräch zusammengefasst.';
  }

  /**
   * Create new conversation memory
   */
  private async createNewConversation(userId: string, coachId: string): Promise<ConversationMemory> {
    // Use pure UUID format for convo_id
    const { v4: uuidv4 } = await import('uuid');
    const convoId = uuidv4();
    
    const memory: ConversationMemory = {
      convo_id: convoId,
      user_id: userId,
      coach_id: coachId,
      last_messages: [],
      message_count: 0,
      rolling_summary: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.saveConversationMemory(memory);
    return memory;
  }

  /**
   * Save conversation memory to database
   */
  private async saveConversationMemory(memory: ConversationMemory): Promise<void> {
    const { error } = await supabase
      .from('coach_chat_memory' as any)
      .upsert({
        convo_id: memory.convo_id,
        user_id: memory.user_id,
        coach_id: memory.coach_id,
        last_messages: memory.last_messages,
        message_count: memory.message_count,
        rolling_summary: memory.rolling_summary,
        updated_at: memory.updated_at
      }, {
        onConflict: 'convo_id'
      });

    if (error) {
      console.error('Error saving conversation memory:', error);
      throw error;
    }
  }

  /**
   * Save memory packet to database
   */
  private async savePacket(packet: Omit<MemoryPacket, 'id'>): Promise<void> {
    const { error } = await supabase
      .from('coach_chat_packets' as any)
      .insert(packet);

    if (error) {
      console.error('Error saving memory packet:', error);
      throw error;
    }
  }

  /**
   * Clear conversation memory (for testing/debugging)
   */
  async clearConversation(userId: string, coachId: string): Promise<void> {
    const memory = await this.loadConversationMemory(userId, coachId);
    if (!memory) return;

    // Delete packets
    await supabase
      .from('coach_chat_packets' as any)
      .delete()
      .eq('convo_id', memory.convo_id);

    // Delete memory
    await supabase
      .from('coach_chat_memory' as any)
      .delete()
      .eq('convo_id', memory.convo_id);
  }
}

export const memoryManager = new MemoryManager();
