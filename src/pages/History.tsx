
import { useTranslation } from "@/hooks/useTranslation";
import History from "@/components/History";

const HistoryPage = () => {
  const { t } = useTranslation();
  
  return <History />;
};

export default HistoryPage;
