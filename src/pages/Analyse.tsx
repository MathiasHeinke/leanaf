import { useTranslation } from "@/hooks/useTranslation";
import History from "@/components/History";
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History as HistoryIcon, Calendar, BarChart3 } from "lucide-react";
import Analysis from "@/pages/Analysis";

const AnalysePage = () => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analyse
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            Verlauf
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="analysis" className="mt-3">
          <Analysis />
        </TabsContent>
        
        <TabsContent value="history" className="mt-3">
          <History />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysePage;