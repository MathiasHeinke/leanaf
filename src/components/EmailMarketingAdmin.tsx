import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Users, BarChart3, Settings, Bot, Calendar, Target, TrendingUp, Zap, ChevronDown, ChevronUp, Copy, Trash2, Loader2 } from 'lucide-react';

interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  template_type: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface EmailCampaign {
  id?: string;
  name: string;
  subject: string;
  campaign_type: string;
  status: string;
  total_recipients: number;
  opened_count: number;
  clicked_count: number;
  scheduled_at?: string;
  sent_at?: string;
  created_at?: string;
  updated_at?: string;
}

const EmailMarketingAdmin = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
    template_type: 'newsletter'
  });

  // New campaign form state
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    campaign_type: 'newsletter'
  });

  // AI generation state
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [testEmailSending, setTestEmailSending] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Loading email templates and campaigns...');
      
      const { data: templatesData, error: templatesError } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Templates loaded:', { error: templatesError, data: templatesData });

      const { data: campaignsData, error: campaignsError } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Campaigns loaded:', { error: campaignsError, data: campaignsData });

      if (templatesError) {
        console.error('Error loading templates:', templatesError);
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Templates",
          variant: "destructive"
        });
      } else {
        setTemplates(templatesData || []);
      }

      if (campaignsError) {
        console.error('Error loading campaigns:', campaignsError);
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Kampagnen",
          variant: "destructive"
        });
      } else {
        setCampaigns(campaignsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Laden der Daten",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Prompt ein",
        variant: "destructive"
      });
      return;
    }

    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          action: 'generate_content',
          prompt: aiPrompt,
          template_type: newTemplate.template_type
        }
      });

      if (error) {
        console.error('Error generating AI content:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Generieren des AI-Inhalts",
          variant: "destructive"
        });
      } else {
        setNewTemplate(prev => ({
          ...prev,
          subject: data.subject || prev.subject,
          html_content: data.html_content || prev.html_content,
          text_content: data.text_content || prev.text_content
        }));
        toast({
          title: "Erfolg",
          description: "AI-Inhalt erfolgreich generiert!"
        });
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Generieren des AI-Inhalts",
        variant: "destructive"
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('email_templates')
        .insert([{
          name: newTemplate.name,
          subject: newTemplate.subject,
          html_content: newTemplate.html_content,
          text_content: newTemplate.text_content,
          template_type: newTemplate.template_type,
          is_active: true
        }]);

      if (error) {
        console.error('Error creating template:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Erstellen des Templates",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Template erfolgreich erstellt!"
        });
        setNewTemplate({
          name: '',
          subject: '',
          html_content: '',
          text_content: '',
          template_type: 'newsletter'
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Erstellen des Templates",
        variant: "destructive"
      });
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.subject.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Fehler",
          description: "Sie müssen angemeldet sein",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('email_campaigns')
        .insert([{
          name: newCampaign.name,
          subject: newCampaign.subject,
          campaign_type: newCampaign.campaign_type,
          status: 'draft',
          total_recipients: 0,
          opened_count: 0,
          clicked_count: 0,
          created_by: user.id
        }]);

      if (error) {
        console.error('Error creating campaign:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Erstellen der Kampagne",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Kampagne erfolgreich erstellt!"
        });
        setNewCampaign({
          name: '',
          subject: '',
          campaign_type: 'newsletter'
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Erstellen der Kampagne",
        variant: "destructive"
      });
    }
  };

  const sendTestEmail = async (templateId: string) => {
    setTestEmailSending(templateId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast({
          title: "Fehler",
          description: "Sie müssen angemeldet sein, um Test-E-Mails zu senden",
          variant: "destructive"
        });
        return;
      }

      // Get template
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        toast({
          title: "Fehler",
          description: "Template nicht gefunden",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          email_type: template.template_type,
          recipient_email: user.email,
          recipient_name: user.user_metadata?.display_name || 'Test User',
          template_id: templateId,
          custom_content: {
            subject: template.subject,
            content: template.html_content
          }
        }
      });

      if (error) {
        console.error('Error sending test email:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Senden der Test-E-Mail",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Test-E-Mail erfolgreich gesendet!"
        });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Senden der Test-E-Mail",
        variant: "destructive"
      });
    } finally {
      setTestEmailSending('');
    }
  };

  const updateTemplate = async (templateId: string, updates: Partial<EmailTemplate>) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', templateId);

      if (error) {
        console.error('Error updating template:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Aktualisieren des Templates",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Template erfolgreich aktualisiert"
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren des Templates",
        variant: "destructive"
      });
    }
  };

  const duplicateTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      const duplicateData = {
        name: `${template.name} (Kopie)`,
        subject: template.subject,
        html_content: template.html_content,
        text_content: template.text_content,
        template_type: template.template_type,
        is_active: false
      };

      const { error } = await supabase
        .from('email_templates')
        .insert(duplicateData);

      if (error) {
        console.error('Error duplicating template:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Duplizieren des Templates",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Template erfolgreich dupliziert"
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Duplizieren des Templates",
        variant: "destructive"
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Template löschen möchten?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting template:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Löschen des Templates",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Template erfolgreich gelöscht"
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Löschen des Templates",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Entwurf</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Geplant</Badge>;
      case 'sending':
        return <Badge variant="default">Wird gesendet</Badge>;
      case 'sent':
        return <Badge variant="default">Gesendet</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-Mail Marketing</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Templates, Kampagnen und automatisierte E-Mail-Sequenzen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Admin Panel</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Send className="h-4 w-4 mr-2" />
            Kampagnen
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Bot className="h-4 w-4 mr-2" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
                <p className="text-xs text-muted-foreground">
                  {templates.filter(t => t.is_active).length} aktiv
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kampagnen</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <p className="text-xs text-muted-foreground">
                  {campaigns.filter(c => c.status === 'sent').length} gesendet
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamte Empfänger</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + c.total_recipients, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Über alle Kampagnen
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Öffnungsrate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 
                    ? Math.round((campaigns.reduce((sum, c) => sum + c.opened_count, 0) / campaigns.reduce((sum, c) => sum + c.total_recipients, 0)) * 100) || 0
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Durchschnittlich
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Letzte Aktivitäten</CardTitle>
              <CardDescription>
                Kürzlich erstellte Templates und Kampagnen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Neueste Templates</h4>
                  <div className="space-y-2">
                    {templates.slice(0, 3).map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground">{template.template_type}</p>
                        </div>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Neueste Kampagnen</h4>
                  <div className="space-y-2">
                    {campaigns.slice(0, 3).map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">{campaign.campaign_type}</p>
                        </div>
                        {getStatusBadge(campaign.status)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Neues Template erstellen</CardTitle>
                <CardDescription>
                  Erstellen Sie wiederverwendbare E-Mail-Templates mit KI-Unterstützung
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-name">Name</Label>
                    <Input
                      id="template-name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Newsletter Vorlage"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="template-type">Typ</Label>
                    <Select 
                      value={newTemplate.template_type}
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, template_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Template-Typ wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="welcome">Willkommen</SelectItem>
                        <SelectItem value="confirmation">Bestätigung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="template-subject">Betreff</Label>
                  <Input
                    id="template-subject"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Ihr wöchentlicher Fitness-Newsletter"
                  />
                </div>

                <div>
                  <Label htmlFor="ai-prompt">KI-Inhalt generieren</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ai-prompt"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Beschreiben Sie den gewünschten E-Mail-Inhalt..."
                    />
                    <Button 
                      onClick={generateAIContent}
                      disabled={generatingAI}
                      variant="outline"
                    >
                      {generatingAI ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Bot className="h-4 w-4 mr-2" />
                          Generieren
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="template-html">HTML Inhalt</Label>
                  <Textarea
                    id="template-html"
                    value={newTemplate.html_content}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, html_content: e.target.value }))}
                    placeholder="<h1>Willkommen!</h1><p>{{user_name}}, ..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label htmlFor="template-text">Text Inhalt (Optional)</Label>
                  <Textarea
                    id="template-text"
                    value={newTemplate.text_content}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, text_content: e.target.value }))}
                    placeholder="Fallback-Text für E-Mail-Clients ohne HTML-Unterstützung"
                    rows={4}
                  />
                </div>

                <Button onClick={createTemplate} className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Template erstellen
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bestehende Templates</CardTitle>
                <CardDescription>
                  Verwalten Sie Ihre E-Mail-Templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          {editingTemplate === template.id && editingField === 'name' ? (
                            <Input
                              value={template.name}
                              onChange={(e) => {
                                const updatedTemplates = templates.map(t => 
                                  t.id === template.id ? { ...t, name: e.target.value } : t
                                );
                                setTemplates(updatedTemplates);
                              }}
                              onBlur={() => {
                                updateTemplate(template.id!, { name: template.name });
                                setEditingTemplate(null);
                                setEditingField(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateTemplate(template.id!, { name: template.name });
                                  setEditingTemplate(null);
                                  setEditingField(null);
                                }
                              }}
                              autoFocus
                              className="text-lg font-semibold"
                            />
                          ) : (
                            <h3 
                              className="text-lg font-semibold cursor-pointer hover:text-primary"
                              onClick={() => {
                                setEditingTemplate(template.id!);
                                setEditingField('name');
                              }}
                            >
                              {template.name}
                            </h3>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedTemplate(
                              expandedTemplate === template.id ? null : template.id!
                            )}
                          >
                            {expandedTemplate === template.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateTemplate(template.id!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendTestEmail(template.id!)}
                            disabled={testEmailSending === template.id}
                          >
                            {testEmailSending === template.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Test'
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteTemplate(template.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        {editingTemplate === template.id && editingField === 'subject' ? (
                          <Input
                            value={template.subject}
                            onChange={(e) => {
                              const updatedTemplates = templates.map(t => 
                                t.id === template.id ? { ...t, subject: e.target.value } : t
                              );
                              setTemplates(updatedTemplates);
                            }}
                            onBlur={() => {
                              updateTemplate(template.id!, { subject: template.subject });
                              setEditingTemplate(null);
                              setEditingField(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateTemplate(template.id!, { subject: template.subject });
                                setEditingTemplate(null);
                                setEditingField(null);
                              }
                            }}
                            autoFocus
                            className="text-sm"
                          />
                        ) : (
                          <p 
                            className="text-sm text-muted-foreground cursor-pointer hover:text-primary"
                            onClick={() => {
                              setEditingTemplate(template.id!);
                              setEditingField('subject');
                            }}
                          >
                            {template.subject}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {template.template_type}
                        </Badge>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>

                      {expandedTemplate === template.id && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          <div>
                            <Label className="text-sm font-medium">HTML Inhalt:</Label>
                            {editingTemplate === template.id && editingField === 'html_content' ? (
                              <div className="mt-2">
                                <textarea
                                  value={template.html_content}
                                  onChange={(e) => {
                                    const updatedTemplates = templates.map(t => 
                                      t.id === template.id ? { ...t, html_content: e.target.value } : t
                                    );
                                    setTemplates(updatedTemplates);
                                  }}
                                  onBlur={() => {
                                    updateTemplate(template.id!, { html_content: template.html_content });
                                    setEditingTemplate(null);
                                    setEditingField(null);
                                  }}
                                  className="w-full h-40 p-2 border rounded font-mono text-sm"
                                  autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      updateTemplate(template.id!, { html_content: template.html_content });
                                      setEditingTemplate(null);
                                      setEditingField(null);
                                    }}
                                  >
                                    Speichern
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTemplate(null);
                                      setEditingField(null);
                                      loadData(); // Reset changes
                                    }}
                                  >
                                    Abbrechen
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="mt-2 p-3 bg-muted rounded cursor-pointer hover:bg-muted/80"
                                onClick={() => {
                                  setEditingTemplate(template.id!);
                                  setEditingField('html_content');
                                }}
                              >
                                <div 
                                  className="text-sm font-mono max-h-32 overflow-y-auto"
                                  dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize(template.html_content.substring(0, 500) + '...', {
                                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'span'],
                                      ALLOWED_ATTR: ['class'],
                                      FORBID_TAGS: ['script', 'object', 'embed', 'iframe'],
                                      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style']
                                    }) 
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          {template.text_content && (
                            <div>
                              <Label className="text-sm font-medium">Text Inhalt:</Label>
                              <div className="mt-2 p-3 bg-muted rounded">
                                <p className="text-sm max-h-32 overflow-y-auto">
                                  {template.text_content.substring(0, 300)}...
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            Erstellt: {new Date(template.created_at!).toLocaleDateString('de-DE')}
                            {template.updated_at && template.updated_at !== template.created_at && (
                              <> | Aktualisiert: {new Date(template.updated_at).toLocaleDateString('de-DE')}</>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Neue Kampagne erstellen</CardTitle>
                <CardDescription>
                  Planen und versenden Sie E-Mail-Kampagnen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Kampagnen-Name</Label>
                  <Input
                    id="campaign-name"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Wöchentlicher Newsletter #42"
                  />
                </div>

                <div>
                  <Label htmlFor="campaign-subject">Betreff</Label>
                  <Input
                    id="campaign-subject"
                    value={newCampaign.subject}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Ihre Fitness-Tipps für diese Woche"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="campaign-type">Typ</Label>
                    <Select 
                      value={newCampaign.campaign_type}
                      onValueChange={(value) => setNewCampaign(prev => ({ ...prev, campaign_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kampagnen-Typ wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="promotional">Werbung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={createCampaign} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Kampagne erstellen
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bestehende Kampagnen</CardTitle>
                <CardDescription>
                  Übersicht aller E-Mail-Kampagnen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Empfänger: {campaign.total_recipients}</span>
                            <span>Geöffnet: {campaign.opened_count}</span>
                            <span>Geklickt: {campaign.clicked_count}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(campaign.status)}
                          <Badge variant="outline" className="text-xs">
                            {campaign.campaign_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>E-Mail Automation</CardTitle>
              <CardDescription>
                Automatisierte E-Mail-Sequenzen und Trigger-basierte Nachrichten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Onboarding-Sequenz</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Willkommens-E-Mail</p>
                        <p className="text-sm text-muted-foreground">Sofort nach Registrierung</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Aktiv</Badge>
                        <Switch checked={true} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Tag 1: Erste Schritte</p>
                        <p className="text-sm text-muted-foreground">24 Stunden nach Registrierung</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Aktiv</Badge>
                        <Switch checked={true} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Tag 3: Tipps & Tricks</p>
                        <p className="text-sm text-muted-foreground">3 Tage nach Registrierung</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Aktiv</Badge>
                        <Switch checked={true} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Woche 1: Fortschritt</p>
                        <p className="text-sm text-muted-foreground">7 Tage nach Registrierung</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Aktiv</Badge>
                        <Switch checked={true} />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Re-Engagement</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Inaktivitäts-Erinnerung</p>
                        <p className="text-sm text-muted-foreground">Nach 7 Tagen Inaktivität</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Aktiv</Badge>
                        <Switch checked={true} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Comeback-Angebot</p>
                        <p className="text-sm text-muted-foreground">Nach 14 Tagen Inaktivität</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Aktiv</Badge>
                        <Switch checked={true} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">KI-gesteuerte Personalisierung</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-5 w-5 text-blue-500" />
                      <h4 className="font-medium">Smart Timing</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      E-Mails werden zu optimalen Zeiten basierend auf Nutzerverhalten versendet
                    </p>
                    <Switch checked={true} />
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-green-500" />
                      <h4 className="font-medium">Inhaltspersonalisierung</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      E-Mail-Inhalte werden basierend auf Nutzerverhalten und Zielen angepasst
                    </p>
                    <Switch checked={true} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gesamt-Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {campaigns.length > 0 
                        ? Math.round((campaigns.reduce((sum, c) => sum + c.opened_count, 0) / campaigns.reduce((sum, c) => sum + c.total_recipients, 0)) * 100) || 0
                        : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Öffnungsrate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {campaigns.length > 0 
                        ? Math.round((campaigns.reduce((sum, c) => sum + c.clicked_count, 0) / campaigns.reduce((sum, c) => sum + c.total_recipients, 0)) * 100) || 0
                        : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Klickrate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Templates</CardTitle>
                <CardDescription>
                  Templates mit der besten Performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates.slice(0, 5).map((template, index) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground">{template.template_type}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{template.is_active ? "Aktiv" : "Inaktiv"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailMarketingAdmin;
