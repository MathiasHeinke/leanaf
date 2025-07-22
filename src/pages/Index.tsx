import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { enUS, de } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MealList } from '@/components/MealList';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton"

const Index = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [meals, setMeals] = useState([]);
  const { user } = useAuth();
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMealsForDate(date);
    }
  }, [user, date]);

  const fetchMealsForDate = async (date: Date) => {
    if (!user) return;
    
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // First get meals
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`)
        .order('created_at', { ascending: false });

      if (mealsError) {
        console.error('Error fetching meals:', mealsError);
        return;
      }

      // Then get images for each meal
      const mealsWithImages = await Promise.all(
        (mealsData || []).map(async (meal) => {
          const { data: imagesData } = await supabase
            .from('meal_images')
            .select('image_url')
            .eq('meal_id', meal.id)
            .eq('user_id', user.id);

          return {
            ...meal,
            images: imagesData?.map(img => img.image_url) || []
          };
        })
      );

      setMeals(mealsWithImages);
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
  };

  const handleMealUpdate = () => {
    fetchMealsForDate(date);
  };

  return (
    <div className="container relative pb-6">
      <div className="md:hidden">
        {/* Mobile View */}
        <Card className="w-full overflow-hidden">
          <CardContent className="flex flex-col space-y-4 p-4 sm:px-5">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? (
                    format(date, "PPP", { locale: de })
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto flex flex-col p-2" align="start">
                <Calendar
                  mode="single"
                  locale={de}
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) =>
                    date > new Date() || date < new Date('2024-01-01')
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block">
        {/* Desktop View */}
        <Card className="w-full overflow-hidden">
          <CardContent className="flex items-center space-x-4 p-4 sm:px-5">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-64 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? (
                    format(date, "PPP", { locale: de })
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={de}
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) =>
                    date > new Date() || date < new Date('2024-01-01')
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        {isFetching ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <MealList
            meals={meals}
            onMealUpdate={handleMealUpdate}
            selectedDate={date.toISOString().split('T')[0]}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
