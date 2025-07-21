
import { useTranslation } from "@/hooks/useTranslation";
import History from "@/components/History";
import { TransformationDashboard } from "@/components/TransformationDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History as HistoryIcon, Target, TrendingUp } from "lucide-react";

const HistoryPage = () => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Verlauf & Progress</h1>
        <p className="text-muted-foreground">Deine Transformation im Überblick</p>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            Verlauf
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="mt-6">
          <History />
        </TabsContent>
        
        <TabsContent value="dashboard" className="mt-6">
          <TransformationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoryPage;
