import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const email = "demo@getlean.app";
    const password = "Demo2024!Secure";

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    let userId: string;
    
    if (existingUser) {
      console.log("Demo user already exists, using existing ID");
      userId = existingUser.id;
      
      // Delete existing demo data to refresh
      await supabase.from("weight_history").delete().eq("user_id", userId);
      await supabase.from("body_measurements").delete().eq("user_id", userId);
      await supabase.from("meals").delete().eq("user_id", userId);
      await supabase.from("workouts").delete().eq("user_id", userId);
      await supabase.from("sleep_tracking").delete().eq("user_id", userId);
      await supabase.from("user_fluids").delete().eq("user_id", userId);
      await supabase.from("daily_summaries").delete().eq("user_id", userId);
      await supabase.from("user_bloodwork").delete().eq("user_id", userId);
      await supabase.from("daily_activities").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("user_id", userId);
      await supabase.from("daily_goals").delete().eq("user_id", userId);
      console.log("Deleted existing demo data");
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        throw new Error(`Failed to create user: ${authError.message}`);
      }
      
      userId = authData.user.id;
      console.log("Created new demo user:", userId);
    }

    // Generate date range (60 days back from today)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 60);

    // Helper functions
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
    const randomInt = (min: number, max: number) => Math.floor(randomBetween(min, max + 1));

    // ============ 1. PROFILE ============
    const profileData = {
      user_id: userId,
      display_name: "Max Mustermann",
      email: email,
      weight: 99.0,
      height: 182,
      age: 37,
      gender: "male",
      activity_level: "moderat_aktiv",
      goal: "fat_loss",
      target_weight: 85,
      start_weight: 99.0,
      body_fat_percentage: 30,
      coach_personality: "drill_instructor",
      daily_calorie_target: 2100,
      protein_target_g: 180,
      carbs_target_g: 200,
      fats_target_g: 70,
      dietary_restrictions: [],
      health_conditions: [],
      onboarding_completed: true,
    };

    await supabase.from("profiles").insert(profileData);
    console.log("Created profile");

    // ============ 2. DAILY GOALS ============
    const dailyGoalsData = {
      user_id: userId,
      goal_date: formatDate(today),
      calories: 2100,
      protein: 180,
      carbs: 200,
      fats: 70,
      fluid_goal_ml: 3000,
      fluids: 3000,
      steps_goal: 10000,
      bmr: 1950,
      tdee: 2700,
      calorie_deficit: 600,
      goal_type: "fat_loss",
    };

    await supabase.from("daily_goals").insert(dailyGoalsData);
    console.log("Created daily goals");

    // ============ 3. WEIGHT HISTORY (60 entries) ============
    const weightEntries = [];
    let currentWeight = 99.0;
    let currentBodyFat = 30.2;

    for (let i = 0; i <= 60; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Base weight loss: ~0.08 kg per day on average
      const dailyLoss = randomBetween(0.02, 0.12);
      
      // Weekend effect (more water retention)
      const dayOfWeek = date.getDay();
      const weekendEffect = (dayOfWeek === 0 || dayOfWeek === 6) ? randomBetween(0.2, 0.5) : 0;
      
      // Random daily fluctuation
      const fluctuation = randomBetween(-0.3, 0.3);
      
      currentWeight = currentWeight - dailyLoss + weekendEffect * 0.3 + fluctuation * 0.5;
      currentWeight = Math.max(93.5, Math.min(99.5, currentWeight)); // Clamp
      
      // Body fat decreases slower
      if (i % 3 === 0) {
        currentBodyFat -= randomBetween(0.03, 0.08);
      }
      currentBodyFat = Math.max(26.5, Math.min(30.5, currentBodyFat));

      weightEntries.push({
        user_id: userId,
        date: formatDate(date),
        weight: Math.round(currentWeight * 10) / 10,
        body_fat_percentage: Math.round(currentBodyFat * 10) / 10,
        notes: i === 0 ? "Startgewicht - Beginn der Transformation" : 
               i === 30 ? "Halbzeit! Fortschritt sichtbar" :
               i === 60 ? "2 Monate geschafft!" : null,
        created_at: date.toISOString(),
      });
    }

    await supabase.from("weight_history").insert(weightEntries);
    console.log(`Created ${weightEntries.length} weight entries`);

    // ============ 4. BODY MEASUREMENTS (8 entries) ============
    const measurementDays = [0, 7, 14, 21, 30, 40, 50, 60];
    const measurements = measurementDays.map((day, idx) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      // Progressive improvement
      const progress = idx / (measurementDays.length - 1);
      
      return {
        user_id: userId,
        date: formatDate(date),
        chest: Math.round((112 - progress * 2) * 10) / 10,
        waist: Math.round((98 - progress * 4) * 10) / 10,
        belly: Math.round((108 - progress * 6) * 10) / 10,
        hips: Math.round((106 - progress * 2) * 10) / 10,
        thigh: Math.round((62 - progress * 1) * 10) / 10,
        arms: Math.round((38 + progress * 0.5) * 10) / 10,
        neck: Math.round((42 - progress * 1) * 10) / 10,
        notes: idx === 0 ? "Ausgangsmessung" : idx === measurementDays.length - 1 ? "Toller Fortschritt!" : null,
        created_at: date.toISOString(),
      };
    });

    await supabase.from("body_measurements").insert(measurements);
    console.log(`Created ${measurements.length} body measurements`);

    // ============ 5. MEALS (~180 entries) ============
    const mealTemplates = {
      breakfast: [
        { name: "Haferflocken mit Beeren und Quark", calories: 450, protein: 25, carbs: 55, fats: 12 },
        { name: "Rührei (3 Eier) mit Vollkornbrot", calories: 420, protein: 28, carbs: 30, fats: 22 },
        { name: "Griechischer Joghurt mit Nüssen", calories: 380, protein: 22, carbs: 25, fats: 18 },
        { name: "Protein-Pancakes", calories: 400, protein: 30, carbs: 40, fats: 10 },
        { name: "Skyr mit Müsli", calories: 350, protein: 28, carbs: 35, fats: 8 },
      ],
      lunch: [
        { name: "Hähnchenbrust mit Reis und Brokkoli", calories: 650, protein: 45, carbs: 60, fats: 15 },
        { name: "Lachs mit Süßkartoffeln", calories: 700, protein: 40, carbs: 50, fats: 28 },
        { name: "Putenbrust-Salat mit Quinoa", calories: 550, protein: 42, carbs: 40, fats: 18 },
        { name: "Rindfleisch-Bowl mit Gemüse", calories: 620, protein: 48, carbs: 45, fats: 22 },
        { name: "Thunfisch-Wrap", calories: 580, protein: 38, carbs: 50, fats: 20 },
      ],
      dinner: [
        { name: "Gegrilltes Hühnchen mit Salat", calories: 480, protein: 42, carbs: 15, fats: 20 },
        { name: "Omelette mit Gemüse", calories: 420, protein: 28, carbs: 12, fats: 28 },
        { name: "Fisch mit gedünstetem Gemüse", calories: 450, protein: 38, carbs: 20, fats: 18 },
        { name: "Magerquark mit Leinöl", calories: 300, protein: 35, carbs: 10, fats: 12 },
        { name: "Hähnchen-Gemüse-Pfanne", calories: 520, protein: 40, carbs: 25, fats: 22 },
      ],
    };

    const meals = [];
    for (let i = 0; i <= 60; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Some days might have fewer meals (fasting, busy)
      const skipMeal = Math.random() < 0.1;
      
      // Breakfast
      if (!skipMeal || Math.random() > 0.5) {
        const template = mealTemplates.breakfast[randomInt(0, 4)];
        const variation = randomBetween(0.85, 1.15);
        const breakfastTime = new Date(date);
        breakfastTime.setHours(randomInt(7, 9), randomInt(0, 59));
        
        meals.push({
          user_id: userId,
          name: template.name,
          calories: Math.round(template.calories * variation),
          protein: Math.round(template.protein * variation),
          carbs: Math.round(template.carbs * variation),
          fats: Math.round(template.fats * variation),
          meal_type: "breakfast",
          eaten_at: breakfastTime.toISOString(),
          ts: breakfastTime.toISOString(),
          created_at: breakfastTime.toISOString(),
        });
      }

      // Lunch
      const lunchTemplate = mealTemplates.lunch[randomInt(0, 4)];
      const lunchVariation = randomBetween(0.85, 1.15);
      const lunchTime = new Date(date);
      lunchTime.setHours(randomInt(12, 14), randomInt(0, 59));
      
      meals.push({
        user_id: userId,
        name: lunchTemplate.name,
        calories: Math.round(lunchTemplate.calories * lunchVariation),
        protein: Math.round(lunchTemplate.protein * lunchVariation),
        carbs: Math.round(lunchTemplate.carbs * lunchVariation),
        fats: Math.round(lunchTemplate.fats * lunchVariation),
        meal_type: "lunch",
        eaten_at: lunchTime.toISOString(),
        ts: lunchTime.toISOString(),
        created_at: lunchTime.toISOString(),
      });

      // Dinner
      const dinnerTemplate = mealTemplates.dinner[randomInt(0, 4)];
      const dinnerVariation = randomBetween(0.85, 1.15);
      const dinnerTime = new Date(date);
      dinnerTime.setHours(randomInt(18, 20), randomInt(0, 59));
      
      meals.push({
        user_id: userId,
        name: dinnerTemplate.name,
        calories: Math.round(dinnerTemplate.calories * dinnerVariation),
        protein: Math.round(dinnerTemplate.protein * dinnerVariation),
        carbs: Math.round(dinnerTemplate.carbs * dinnerVariation),
        fats: Math.round(dinnerTemplate.fats * dinnerVariation),
        meal_type: "dinner",
        eaten_at: dinnerTime.toISOString(),
        ts: dinnerTime.toISOString(),
        created_at: dinnerTime.toISOString(),
      });
    }

    // Insert in batches
    for (let i = 0; i < meals.length; i += 50) {
      await supabase.from("meals").insert(meals.slice(i, i + 50));
    }
    console.log(`Created ${meals.length} meals`);

    // ============ 6. WORKOUTS (24 entries, ~4x/week) ============
    const workoutTemplates = [
      { type: "Push Day", muscle_groups: ["chest", "shoulders", "triceps"], exercises: 6 },
      { type: "Pull Day", muscle_groups: ["back", "biceps", "rear_delts"], exercises: 6 },
      { type: "Leg Day", muscle_groups: ["quads", "hamstrings", "glutes", "calves"], exercises: 7 },
      { type: "Upper Body", muscle_groups: ["chest", "back", "shoulders", "arms"], exercises: 8 },
      { type: "Cardio", muscle_groups: ["cardio"], exercises: 1 },
    ];

    const workouts = [];
    let workoutDay = 0;
    for (let i = 0; i <= 60; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Skip some days (rest days, typically 3 per week)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || (dayOfWeek === 3 && Math.random() < 0.7) || (dayOfWeek === 6 && Math.random() < 0.5)) {
        continue;
      }
      
      if (Math.random() < 0.3) continue; // Random rest day
      
      const template = workoutTemplates[workoutDay % 4]; // Rotate through templates
      workoutDay++;
      
      const workoutTime = new Date(date);
      workoutTime.setHours(randomInt(6, 19), randomInt(0, 59));
      
      workouts.push({
        user_id: userId,
        date: formatDate(date),
        workout_type: template.type,
        muscle_groups: template.muscle_groups,
        duration_minutes: randomInt(45, 75),
        intensity: randomInt(6, 9),
        exercises_count: template.exercises,
        sets_count: randomInt(15, 25),
        notes: workoutDay % 10 === 0 ? "Neue PRs heute! 💪" : null,
        calories_burned: randomInt(300, 500),
        created_at: workoutTime.toISOString(),
      });
    }

    await supabase.from("workouts").insert(workouts);
    console.log(`Created ${workouts.length} workouts`);

    // ============ 7. SLEEP TRACKING (60 entries) ============
    const sleepEntries = [];
    for (let i = 0; i <= 60; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Weekends: later to bed, more sleep
      const sleepHours = isWeekend ? randomBetween(7, 9) : randomBetween(6, 8);
      const sleepQuality = randomInt(3, 5);
      
      const bedTime = new Date(date);
      bedTime.setDate(bedTime.getDate() - 1);
      bedTime.setHours(isWeekend ? randomInt(23, 24) : randomInt(22, 23), randomInt(0, 59));
      
      const wakeTime = new Date(date);
      wakeTime.setHours(isWeekend ? randomInt(8, 10) : randomInt(6, 7), randomInt(0, 59));

      sleepEntries.push({
        user_id: userId,
        date: formatDate(date),
        sleep_hours: Math.round(sleepHours * 10) / 10,
        sleep_quality: sleepQuality,
        bed_time: bedTime.toISOString(),
        wake_time: wakeTime.toISOString(),
        notes: sleepQuality === 5 ? "Perfekt geschlafen!" : sleepQuality <= 3 ? "Unruhige Nacht" : null,
        created_at: date.toISOString(),
      });
    }

    await supabase.from("sleep_tracking").insert(sleepEntries);
    console.log(`Created ${sleepEntries.length} sleep entries`);

    // ============ 8. USER FLUIDS (~120 entries) ============
    const fluidEntries = [];
    for (let i = 0; i <= 60; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // 2-4 water entries per day
      const numEntries = randomInt(2, 4);
      for (let j = 0; j < numEntries; j++) {
        const entryTime = new Date(date);
        entryTime.setHours(8 + j * 4, randomInt(0, 59));
        
        fluidEntries.push({
          user_id: userId,
          date: formatDate(date),
          amount_ml: randomInt(400, 800),
          fluid_type: j === 0 && Math.random() < 0.3 ? "coffee" : "water",
          created_at: entryTime.toISOString(),
        });
      }
    }

    // Insert in batches
    for (let i = 0; i < fluidEntries.length; i += 50) {
      await supabase.from("user_fluids").insert(fluidEntries.slice(i, i + 50));
    }
    console.log(`Created ${fluidEntries.length} fluid entries`);

    // ============ 9. DAILY ACTIVITIES (60 entries) ============
    const activityEntries = [];
    for (let i = 0; i <= 60; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Weekends typically less active
      const baseSteps = isWeekend ? randomInt(5000, 10000) : randomInt(8000, 14000);
      
      activityEntries.push({
        user_id: userId,
        date: formatDate(date),
        steps: baseSteps,
        calories_burned: Math.round(baseSteps * 0.04),
        distance_km: Math.round(baseSteps * 0.0007 * 10) / 10,
        activity_minutes: randomInt(30, 90),
        heart_rate_avg: randomInt(65, 85),
        created_at: date.toISOString(),
      });
    }

    await supabase.from("daily_activities").insert(activityEntries);
    console.log(`Created ${activityEntries.length} activity entries`);

    // ============ 10. BLOODWORK (2 entries) ============
    const bloodworkEntries = [
      {
        user_id: userId,
        test_date: formatDate(startDate),
        lab_name: "LabCorp Deutschland",
        is_fasted: true,
        notes: "Baseline Blutbild vor Transformation",
        // Hormones
        total_testosterone: 420,
        free_testosterone: 12.5,
        estradiol: 38,
        shbg: 35,
        // Thyroid
        tsh: 2.8,
        free_t3: 3.2,
        free_t4: 1.1,
        // Metabolic
        fasting_glucose: 102,
        hba1c: 5.8,
        fasting_insulin: 12,
        // Lipids
        total_cholesterol: 225,
        ldl: 142,
        hdl: 42,
        triglycerides: 165,
        // Vitamins
        vitamin_d: 28,
        vitamin_b12: 380,
        ferritin: 45,
        iron: 85,
        // Blood
        hemoglobin: 14.8,
        hematocrit: 44,
        rbc: 4.9,
        wbc: 6.2,
        platelets: 245,
        // Organs
        alt: 32,
        ast: 28,
        ggt: 35,
        creatinine: 1.0,
        egfr: 95,
        created_at: startDate.toISOString(),
      },
      {
        user_id: userId,
        test_date: formatDate(new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)), // 5 days ago
        lab_name: "LabCorp Deutschland",
        is_fasted: true,
        notes: "Kontrolluntersuchung nach 2 Monaten - deutliche Verbesserungen!",
        // Hormones - improved
        total_testosterone: 485,
        free_testosterone: 14.8,
        estradiol: 32,
        shbg: 38,
        // Thyroid
        tsh: 2.2,
        free_t3: 3.4,
        free_t4: 1.2,
        // Metabolic - improved
        fasting_glucose: 92,
        hba1c: 5.5,
        fasting_insulin: 8,
        // Lipids - improved
        total_cholesterol: 198,
        ldl: 118,
        hdl: 48,
        triglycerides: 125,
        // Vitamins - improved with supplementation
        vitamin_d: 52,
        vitamin_b12: 520,
        ferritin: 72,
        iron: 98,
        // Blood
        hemoglobin: 15.2,
        hematocrit: 45,
        rbc: 5.0,
        wbc: 5.8,
        platelets: 238,
        // Organs
        alt: 25,
        ast: 24,
        ggt: 28,
        creatinine: 0.95,
        egfr: 98,
        created_at: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    await supabase.from("user_bloodwork").insert(bloodworkEntries);
    console.log("Created 2 bloodwork entries");

    // ============ 11. DAILY SUMMARIES (sample entries) ============
    const summaryDays = [0, 7, 14, 21, 30, 45, 60];
    const summaries = summaryDays.map(day => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      return {
        user_id: userId,
        date: formatDate(date),
        total_calories: randomInt(1900, 2300),
        total_protein: randomInt(150, 200),
        total_carbs: randomInt(180, 250),
        total_fats: randomInt(60, 90),
        sleep_score: randomInt(70, 95),
        hydration_score: randomInt(75, 100),
        mindset_data: { mood: randomInt(3, 5), energy: randomInt(3, 5), stress: randomInt(1, 3) },
        created_at: date.toISOString(),
      };
    });

    await supabase.from("daily_summaries").insert(summaries);
    console.log(`Created ${summaries.length} daily summaries`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo account created successfully!",
        credentials: {
          email,
          password,
          url: "https://getleanai.lovable.app"
        },
        stats: {
          weightEntries: weightEntries.length,
          bodyMeasurements: measurements.length,
          meals: meals.length,
          workouts: workouts.length,
          sleepEntries: sleepEntries.length,
          fluidEntries: fluidEntries.length,
          activityEntries: activityEntries.length,
          bloodworkEntries: bloodworkEntries.length,
          summaries: summaries.length,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating demo account:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
