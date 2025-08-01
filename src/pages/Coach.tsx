
import Coach from "@/components/Coach";
import Last3DaysSummary from "@/components/Last3DaysSummary";
import Generate14DaysSummary from "@/components/Generate14DaysSummary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CoachPage = () => {
  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">💬 Chat mit Lucy</TabsTrigger>
          <TabsTrigger value="summaries">📊 Letzte 3 Tage</TabsTrigger>
          <TabsTrigger value="generate">🚀 14-Tage XL-Gen</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-6">
          <Coach />
        </TabsContent>
        <TabsContent value="summaries" className="mt-6">
          <Last3DaysSummary />
        </TabsContent>
        <TabsContent value="generate" className="mt-6">
          <Generate14DaysSummary />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoachPage;
