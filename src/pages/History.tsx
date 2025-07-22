
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, TrendingUp } from "lucide-react";
import { HistoryCharts } from "@/components/HistoryCharts";
import { HistoryTable } from "@/components/HistoryTable";
import { PointsHistoryModal } from "@/components/PointsHistoryModal";

const History = () => {
  const [showPointsHistory, setShowPointsHistory] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <HistoryIcon className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Verlauf</h1>
        </div>
        
        <Button
          onClick={() => setShowPointsHistory(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Punkte-Verlauf
        </Button>
      </div>

      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="charts">Diagramme</TabsTrigger>
          <TabsTrigger value="table">Tabelle</TabsTrigger>
        </TabsList>
        
        <TabsContent value="charts" className="space-y-6">
          <HistoryCharts />
        </TabsContent>
        
        <TabsContent value="table" className="space-y-6">
          <HistoryTable />
        </TabsContent>
      </Tabs>

      <PointsHistoryModal
        isOpen={showPointsHistory}
        onClose={() => setShowPointsHistory(false)}
      />
    </div>
  );
};

export default History;
