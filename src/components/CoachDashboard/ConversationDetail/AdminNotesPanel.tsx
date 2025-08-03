import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminNote } from '@/types/coach-dashboard';
import { useCreateAdminNote, useUpdateAdminNoteStatus } from '@/hooks/useCoachDashboard';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  StickyNote, 
  Plus, 
  Save, 
  Eye, 
  Brain, 
  Archive, 
  User,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { mutate } from 'swr';

interface AdminNotesPanelProps {
  conversationId: string;
  notes: AdminNote[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'reviewed':
      return <Brain className="h-4 w-4 text-blue-500" />;
    case 'archived':
      return <Archive className="h-4 w-4 text-gray-500" />;
    default:
      return <Eye className="h-4 w-4 text-orange-500" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'reviewed':
      return 'Verstanden';
    case 'archived':
      return 'Abgelegt';
    default:
      return 'Gelesen';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'reviewed':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'archived':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-orange-600 bg-orange-50 border-orange-200';
  }
};

export const AdminNotesPanel: React.FC<AdminNotesPanelProps> = ({
  conversationId,
  notes,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('open');
  const [loading, setLoading] = useState(false);

  const createNote = useCreateAdminNote();
  const updateStatus = useUpdateAdminNoteStatus();

  const handleSaveNote = async () => {
    if (!newNote.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine Notiz ein",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await createNote(conversationId, newNote, newStatus);
      
      // Refresh data
      mutate(['admin-notes', conversationId]);
      
      // Reset form
      setNewNote('');
      setNewStatus('open');
      setIsCreating(false);
      
      toast({
        title: "Erfolg",
        description: "Notiz wurde gespeichert",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Notiz konnte nicht gespeichert werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (noteId: string, status: string) => {
    try {
      await updateStatus(noteId, status);
      
      // Refresh data
      mutate(['admin-notes', conversationId]);
      
      toast({
        title: "Erfolg",
        description: "Status wurde aktualisiert",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  // Sort notes by created_at descending
  const sortedNotes = [...notes].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header with Add Button */}
      <div className="border-b bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Admin-Notizen</h3>
            <Badge variant="secondary" className="text-xs">
              {notes.length}
            </Badge>
          </div>
          
          {!isCreating && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Neue Notiz
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* New Note Form */}
          {isCreating && (
            <Card className="border-dashed border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Neue Admin-Notiz
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Ihre Notiz..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                
                <div className="flex items-center gap-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Gelesen</SelectItem>
                      <SelectItem value="reviewed">Verstanden</SelectItem>
                      <SelectItem value="archived">Abgelegt</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex gap-2 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreating(false);
                        setNewNote('');
                        setNewStatus('open');
                      }}
                      className="h-8 px-3 text-xs"
                    >
                      Abbrechen
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={loading}
                      className="h-8 px-3 text-xs"
                    >
                      {loading ? (
                        <>Speichern...</>
                      ) : (
                        <>
                          <Save className="h-3 w-3 mr-1" />
                          Speichern
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Notes */}
          {sortedNotes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Keine Notizen vorhanden</p>
              <p className="text-sm">Erstellen Sie die erste Admin-Notiz für dieses Gespräch</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedNotes.map((note) => (
                <Card key={note.id} className="shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Admin</span>
                        <span className="text-xs text-muted-foreground">
                          {note.admin_user_id.slice(0, 8)}...
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={note.status}
                          onValueChange={(status) => handleUpdateStatus(note.id, status)}
                        >
                          <SelectTrigger className="w-32 h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Gelesen
                              </div>
                            </SelectItem>
                            <SelectItem value="reviewed">
                              <div className="flex items-center gap-1">
                                <Brain className="h-3 w-3" />
                                Verstanden
                              </div>
                            </SelectItem>
                            <SelectItem value="archived">
                              <div className="flex items-center gap-1">
                                <Archive className="h-3 w-3" />
                                Abgelegt
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(note.created_at), 'dd.MM. HH:mm', { locale: de })}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="bg-muted/30 rounded-md p-3">
                      <div className="text-sm whitespace-pre-wrap">
                        {note.note}
                      </div>
                    </div>
                    
                    {/* Metadata */}
                    {Object.keys(note.metadata).length > 0 && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <details>
                          <summary className="cursor-pointer">Metadaten</summary>
                          <pre className="mt-1 text-xs overflow-x-auto">
                            {JSON.stringify(note.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
