import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSimpleStreamingChat } from '@/hooks/useSimpleStreamingChat';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function SimpleLucyChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { streamingMessage, isConnected, error, startStreaming, clearStreamingMessage } = useSimpleStreamingChat();

  // Load chat history
  useEffect(() => {
    if (!user?.id) return;
    
    const loadHistory = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_personality', 'lucy')
        .gte('conversation_date', today)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Failed to load chat history:', error);
        return;
      }

      const historyMessages: ChatMessage[] = (data || []).map(row => ({
        id: row.id?.toString() || `msg-${Date.now()}-${Math.random()}`,
        role: row.message_role as 'user' | 'assistant',
        content: row.message_content || '',
        created_at: row.created_at || new Date().toISOString()
      }));

      setMessages(historyMessages);
      
      // Add welcome message if no history
      if (historyMessages.length === 0) {
        const welcomeMsg: ChatMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: 'Hallo! 👋 Ich bin Lucy, deine Ernährungs- und Fitness-Coachin. Wie kann ich dir heute helfen?',
          created_at: new Date().toISOString()
        };
        setMessages([welcomeMsg]);
      }
    };
    
    loadHistory();
  }, [user?.id]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !user?.id || isLoading || isConnected) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to DB
    const today = new Date().toISOString().split('T')[0];
    const { error: dbError } = await supabase.from('coach_conversations').insert({
      user_id: user.id,
      message_role: 'user',
      message_content: inputText,
      coach_personality: 'lucy',
      conversation_date: today
    });

    if (dbError) {
      console.error('❌ Failed to save user message:', dbError);
      toast.error('Fehler beim Speichern der Nachricht');
    }

    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      // Get recent conversation history
      const recentMessages = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      }));

      console.log('🚀 Sending message to Lucy:', currentInput.substring(0, 50));
      
      await startStreaming(
        user.id,
        currentInput,
        'lucy',
        recentMessages
      );

    } catch (error) {
      console.error('❌ Send message error:', error);
      toast.error('Fehler beim Senden der Nachricht');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, user?.id, isLoading, isConnected, messages, startStreaming]);

  // Handle completed streaming
  useEffect(() => {
    if (streamingMessage && streamingMessage.isComplete) {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: streamingMessage.content,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to DB
      const today = new Date().toISOString().split('T')[0];
      supabase.from('coach_conversations').insert({
        user_id: user?.id,
        message_role: 'assistant',
        message_content: streamingMessage.content,
        coach_personality: 'lucy',
        conversation_date: today
      }).then(({ error }) => {
        if (error) {
          console.error('❌ Failed to save assistant message:', error);
        } else {
          console.log('✅ Assistant message saved');
        }
      });

      clearStreamingMessage();
    }
  }, [streamingMessage, clearStreamingMessage, user?.id]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Lucy Chat - Live Test
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Streaming message */}
              {streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">
                    <p className="text-sm whitespace-pre-wrap">
                      {streamingMessage.content}
                      {streamingMessage.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                      )}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Loading indicator */}
              {isLoading && !streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Lucy denkt nach...</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error display */}
              {error && (
                <div className="flex justify-center">
                  <div className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    <p className="text-sm">❌ {error}</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <Separator className="my-4" />
          
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Schreibe eine Nachricht an Lucy..."
              disabled={isLoading || isConnected}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading || isConnected}
              size="sm"
            >
              {isLoading || isConnected ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}