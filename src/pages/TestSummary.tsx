import React from 'react';
import SummaryGenerator from '@/components/SummaryGenerator';

const TestSummaryPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">XL-Memory Test</h1>
        <p className="text-muted-foreground">
          Teste die neue XL-Summary Generation für erweiterte Coach-Memory
        </p>
      </div>
      <SummaryGenerator />
    </div>
  );
};

export default TestSummaryPage;