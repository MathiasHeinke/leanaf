
import { useTranslation } from "@/hooks/useTranslation";
import History from "@/components/History";
import { TransformationDashboard } from "@/components/TransformationDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History as HistoryIcon, Target, TrendingUp } from "lucide-react";

const HistoryPage = () => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            Verlauf
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="mt-3">
          <History />
        </TabsContent>
        
        <TabsContent value="dashboard" className="mt-3">
          <TransformationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoryPage;
