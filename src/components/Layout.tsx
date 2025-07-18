import { GlobalHeader, FloatingBottomNav } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { MealInput } from "@/components/MealInput";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { MealConfirmationDialog } from "@/components/MealConfirmationDialog";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Always call hooks first before any early returns
  const mealInputProps = useGlobalMealInput();
  
  // Don't show header on auth page - early return AFTER hook calls
  if (location.pathname === '/auth' || !user) {
    return <>{children}</>;
  }
  
  // Pages where floating meal input should be shown (exclude coach page)
  const showMealInput = ['/', '/history'].includes(location.pathname);

  const handleMealSaveSuccess = () => {
    // Reset the form after successful save
    mealInputProps.setInputText('');
    mealInputProps.setUploadedImages([]);
    mealInputProps.setAnalyzedMealData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 relative overflow-hidden">
      {/* Background Geometric Shapes for Glass Effect - Animated */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-primary-glow/10 rounded-full blur-2xl animate-float-1"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-carbs/25 to-carbs/10 rounded-full blur-xl animate-float-2"></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-gradient-to-br from-fats/20 to-fats/5 rounded-full blur-2xl animate-float-3"></div>
        <div className="absolute bottom-60 right-10 w-20 h-20 bg-gradient-to-br from-protein/30 to-protein/10 rounded-full blur-xl animate-float-4"></div>
        <div className="absolute top-1/3 left-1/2 w-40 h-20 bg-gradient-to-r from-primary/10 to-transparent rounded-full blur-3xl transform -translate-x-1/2 rotate-45 animate-float-5"></div>
      </div>
      
      <GlobalHeader />
      <main className="container mx-auto px-4 pb-6 max-w-md relative z-10">
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
      
      {/* Meal Confirmation Dialog */}
      <MealConfirmationDialog 
        isOpen={mealInputProps.showConfirmationDialog}
        onClose={() => mealInputProps.setShowConfirmationDialog(false)}
        analyzedMealData={mealInputProps.analyzedMealData}
        selectedMealType={mealInputProps.selectedMealType}
        onMealTypeChange={mealInputProps.setSelectedMealType}
        onSuccess={handleMealSaveSuccess}
      />
      
      {/* Floating Bottom Navigation */}
      <FloatingBottomNav />
    </div>
  );
};