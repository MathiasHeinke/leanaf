import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { MealInput } from "@/components/MealInput";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Pages where floating meal input should be shown (exclude coach page)
  const showMealInput = ['/', '/history'].includes(location.pathname);
  
  const mealInputProps = useGlobalMealInput();

  // Don't show header on auth page
  if (location.pathname === '/auth' || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      <GlobalHeader />
      <main className="container mx-auto px-4 pb-6 max-w-md">
        {children}
      </main>
      
      {/* Global floating meal input - only on specific pages */}
      {showMealInput && user && (
        <MealInput 
          inputText={mealInputProps.inputText}
          setInputText={mealInputProps.setInputText}
          onSubmitMeal={mealInputProps.handleSubmitMeal}
          onPhotoUpload={mealInputProps.handlePhotoUpload}
          onVoiceRecord={mealInputProps.handleVoiceRecord}
          isAnalyzing={mealInputProps.isAnalyzing}
          isRecording={mealInputProps.isRecording}
          isProcessing={mealInputProps.isProcessing}
          uploadedImages={mealInputProps.uploadedImages}
          onRemoveImage={mealInputProps.removeImage}
        />
      )}
    </div>
  );
};