import React from 'react';
import { MainHeader } from '@/components/MainHeader';
import { Greeting } from '@/components/Greeting';
import { DailySummary } from '@/components/DailySummary';
import { PointsSummary } from '@/components/PointsSummary';
import { Achievements } from '@/components/Achievements';
import { DailyLog } from '@/components/DailyLog';
import { DailyCoachMessage } from '@/components/DailyCoachMessage';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MainHeader />
      <div className="container py-6 space-y-4">
        <Greeting />
        <DailySummary />
        <PointsSummary />
        <Achievements />
        <DailyCoachMessage />
        <DailyLog />
      </div>
    </div>
  );
};

export default Index;
