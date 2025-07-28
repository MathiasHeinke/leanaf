import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Mail, Send, Users, TrendingUp, Bot, Calendar, Settings, BarChart3, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  template_type: string;
  html_content: string;
  text_content: string;
  is_active: boolean;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  campaign_type: string;
  status: string;
  total_recipients: number;
  opened_count: number;
  clicked_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
}

const EmailMarketingAdmin = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Template creation form
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    template_type: 'newsletter',
    html_content: '',
    text_content: ''
  });

  // Campaign creation form
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    campaign_type: 'newsletter',
    template_id: '',
    target_audience: {},
    scheduled_at: ''
  });

  // AI content generation
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, campaignsData] = await Promise.all([
        supabase.from('email_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('email_campaigns').select('*').order('created_at', { ascending: false })
      ]);

      if (templatesData.data) setTemplates(templatesData.data);
      if (campaignsData.data) setCampaigns(campaignsData.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    }
  };

  const generateAIContent = async () => {
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          type: 'ai_content_generation',
          prompt: aiPrompt,
          template_type: newTemplate.template_type
        }
      });

      if (error) throw error;

      if (data?.content) {
        setNewTemplate(prev => ({
          ...prev,
          subject: data.content.subject || prev.subject,
          html_content: data.content.html_content || prev.html_content,
          text_content: data.content.text_content || prev.text_content
        }));
        toast.success('KI-Inhalt generiert!');
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast.error('Fehler bei der KI-Generierung');
    } finally {
      setAiGenerating(false);
    }
  };

  const createTemplate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .insert([newTemplate]);

      if (error) throw error;

      toast.success('Template erstellt!');
      setNewTemplate({
        name: '',
        subject: '',
        template_type: 'newsletter',
        html_content: '',
        text_content: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Fehler beim Erstellen des Templates');
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .insert([{
          ...newCampaign,
          created_by: user?.id,
          scheduled_at: newCampaign.scheduled_at ? new Date(newCampaign.scheduled_at).toISOString() : null
        }]);

      if (error) throw error;

      toast.success('Kampagne erstellt!');
      setNewCampaign({
        name: '',
        subject: '',
        campaign_type: 'newsletter',
        template_id: '',
        target_audience: {},
        scheduled_at: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Fehler beim Erstellen der Kampagne');
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async (templateId: string) => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          type: 'newsletter',
          email: user.email,
          user_name: 'Test User',
          user_id: user.id,
          template_id: templateId,
          ai_generate: false
        }
      });

      if (error) throw error;
      toast.success('Test-E-Mail gesendet!');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Fehler beim Senden der Test-E-Mail');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Entwurf', variant: 'secondary' as const },
      scheduled: { label: 'Geplant', variant: 'outline' as const },
      sending: { label: 'Sendend', variant: 'default' as const },
      sent: { label: 'Gesendet', variant: 'secondary' as const },
      cancelled: { label: 'Abgebrochen', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">E-Mail Marketing</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Templates, Kampagnen und automatisierte E-Mail-Sequenzen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <CardTitle className="text-sm font-medium">Empfänger</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + c.total_recipients, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Gesamt versandt</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Öffnungsrate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 
                    ? Math.round((campaigns.reduce((sum, c) => sum + c.opened_count, 0) / 
                        Math.max(campaigns.reduce((sum, c) => sum + c.total_recipients, 0), 1)) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Durchschnitt</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Letzte Kampagnen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {campaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{campaign.name}</h4>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(campaign.status)}
                      <span className="text-sm text-muted-foreground">
                        {campaign.total_recipients} Empfänger
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      placeholder="Newsletter Template"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-type">Typ</Label>
                    <Select 
                      value={newTemplate.template_type}
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, template_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Willkommen</SelectItem>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="onboarding_sequence">Onboarding</SelectItem>
                        <SelectItem value="activity_encouragement">Engagement</SelectItem>
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

                <Separator />

                <div className="space-y-3">
                  <Label>KI-Inhalt generieren</Label>
                  <div className="flex gap-2">
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Beschreiben Sie den gewünschten Inhalt..."
                    />
                    <Button
                      onClick={generateAIContent}
                      disabled={aiGenerating || !aiPrompt.trim()}
                      size="sm"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      {aiGenerating ? 'Generiere...' : 'Generieren'}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="template-html">HTML Inhalt</Label>
                  <Textarea
                    id="template-html"
                    value={newTemplate.html_content}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, html_content: e.target.value }))}
                    placeholder="HTML-Inhalt des Templates..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label htmlFor="template-text">Text Inhalt (Optional)</Label>
                  <Textarea
                    id="template-text"
                    value={newTemplate.text_content}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, text_content: e.target.value }))}
                    placeholder="Text-Version für E-Mail-Clients ohne HTML..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={createTemplate} 
                  disabled={loading || !newTemplate.name || !newTemplate.subject}
                  className="w-full"
                >
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
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendTestEmail(template.id)}
                            disabled={loading}
                          >
                            Test
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{template.subject}</p>
                      <Badge variant="outline" className="text-xs">
                        {template.template_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="announcement">Ankündigung</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="campaign-template">Template</Label>
                    <Select 
                      value={newCampaign.template_id}
                      onValueChange={(value) => setNewCampaign(prev => ({ ...prev, template_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Template wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.filter(t => t.is_active).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="campaign-schedule">Zeitplanung (Optional)</Label>
                  <Input
                    id="campaign-schedule"
                    type="datetime-local"
                    value={newCampaign.scheduled_at}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  />
                </div>

                <Button 
                  onClick={createCampaign} 
                  disabled={loading || !newCampaign.name || !newCampaign.subject}
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Kampagne erstellen
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kampagnen-Übersicht</CardTitle>
                <CardDescription>
                  Status und Performance Ihrer Kampagnen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{campaign.name}</h4>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{campaign.subject}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Typ: {campaign.campaign_type}</span>
                        <span>{campaign.total_recipients} Empfänger</span>
                      </div>
                      {campaign.status === 'sent' && (
                        <div className="mt-2 flex items-center gap-4 text-xs">
                          <span>Geöffnet: {campaign.opened_count}</span>
                          <span>Geklickt: {campaign.clicked_count}</span>
                        </div>
                      )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Onboarding-Sequenz</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Willkommens-E-Mail</p>
                        <p className="text-sm text-muted-foreground">Sofort nach Registrierung</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Tag 3: Erste Schritte</p>
                        <p className="text-sm text-muted-foreground">3 Tage nach Registrierung</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Woche 1: Fortschritt</p>
                        <p className="text-sm text-muted-foreground">7 Tage nach Registrierung</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Re-Engagement</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">3 Tage inaktiv</p>
                        <p className="text-sm text-muted-foreground">Sanfte Erinnerung</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">1 Woche inaktiv</p>
                        <p className="text-sm text-muted-foreground">Motivations-E-Mail</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">2 Wochen inaktiv</p>
                        <p className="text-sm text-muted-foreground">Comeback-Angebot</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">KI-gesteuerte Personalisierung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-5 w-5 text-blue-500" />
                      <h4 className="font-medium">Smart Timing</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      KI analysiert optimale Sendezeiten basierend auf Nutzerverhalten
                    </p>
                    <Switch className="mt-3" defaultChecked />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-5 w-5 text-green-500" />
                      <h4 className="font-medium">Personalisierte Inhalte</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Inhalte werden basierend auf Nutzeraktivitäten angepasst
                    </p>
                    <Switch className="mt-3" defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gesamt-Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Versendete E-Mails</span>
                      <span className="font-medium">
                        {campaigns.reduce((sum, c) => sum + c.total_recipients, 0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Öffnungsrate</span>
                      <span className="font-medium">
                        {campaigns.length > 0 
                          ? Math.round((campaigns.reduce((sum, c) => sum + c.opened_count, 0) / 
                              Math.max(campaigns.reduce((sum, c) => sum + c.total_recipients, 0), 1)) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Klickrate</span>
                      <span className="font-medium">
                        {campaigns.length > 0 
                          ? Math.round((campaigns.reduce((sum, c) => sum + c.clicked_count, 0) / 
                              Math.max(campaigns.reduce((sum, c) => sum + c.total_recipients, 0), 1)) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates.slice(0, 5).map((template, index) => (
                    <div key={template.id} className="flex items-center justify-between">
                      <span className="text-sm">{template.name}</span>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Onboarding aktiv</span>
                    <Badge className="bg-green-100 text-green-800">Läuft</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Re-Engagement</span>
                    <Badge className="bg-green-100 text-green-800">Läuft</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Newsletter</span>
                    <Badge variant="outline">Geplant</Badge>
                  </div>
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