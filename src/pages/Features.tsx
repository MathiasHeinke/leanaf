import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lightbulb, Vote, TrendingUp } from 'lucide-react';
import { FeatureRequestDialog } from '@/components/FeatureRequestDialog';
import { FeatureRequestList } from '@/components/FeatureRequestList';

export default function Features() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Requests</h1>
          <p className="text-muted-foreground">
            Schlage neue Features vor und vote für deine Favoriten
          </p>
        </div>
        <FeatureRequestDialog 
          trigger={
            <Button className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Feature vorschlagen
            </Button>
          } 
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Features</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">
              +12 diese Woche
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Implementiert</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">37</div>
            <p className="text-xs text-muted-foreground">
              26% aller Requests
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deine Votes</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              Features gevotet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Alle Features</TabsTrigger>
          <TabsTrigger value="popular">Beliebt</TabsTrigger>
          <TabsTrigger value="recent">Neueste</TabsTrigger>
          <TabsTrigger value="mine">Meine</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <FeatureRequestList />
        </TabsContent>
        
        <TabsContent value="popular" className="space-y-4">
          <FeatureRequestList />
        </TabsContent>
        
        <TabsContent value="recent" className="space-y-4">
          <FeatureRequestList />
        </TabsContent>
        
        <TabsContent value="mine" className="space-y-4">
          <FeatureRequestList />
        </TabsContent>
      </Tabs>
    </div>
  );
}