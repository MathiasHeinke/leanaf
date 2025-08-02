import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TrainingPlanCard } from '../TrainingPlanCard';

const mockPlan = [
  {
    day: 'Montag',
    focus: 'Oberkörper',
    exercises: [
      { name: 'Bankdrücken', sets: '3x8-10', rpe: '8', load: '80kg' },
      { name: 'Klimmzüge', sets: '3x5-8', rpe: '7' },
      { name: 'Schulterdrücken', sets: '3x10-12', rpe: '7' }
    ]
  },
  {
    day: 'Mittwoch',
    focus: 'Unterkörper',
    exercises: [
      { name: 'Kniebeugen', sets: '3x8-10', rpe: '8', load: '100kg' },
      { name: 'Kreuzheben', sets: '1x5', rpe: '9', load: '120kg' }
    ]
  },
  {
    day: 'Freitag',
    focus: 'Ganzkörper',
    exercises: [
      { name: 'Overhead Press', sets: '3x8', rpe: '7' }
    ]
  }
];

const mockHtmlContent = `
  <div class="p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
    <h3 class="text-lg font-semibold text-primary dark:text-primary mb-2">✅ Trainingsplan erstellt</h3>
    <p class="text-foreground dark:text-foreground mb-2"><strong>Kraft-Aufbau Plan</strong></p>
    <p class="text-sm text-muted-foreground">Systematischer Kraftaufbau über 12 Wochen</p>
  </div>
`;

describe('TrainingPlanCard', () => {
  it('renders training plan with structured data', () => {
    render(<TrainingPlanCard plan={mockPlan} />);
    
    expect(screen.getByText('Trainingsplan')).toBeInTheDocument();
    expect(screen.getByText('Montag: Oberkörper')).toBeInTheDocument();
    expect(screen.getByText('Bankdrücken - 3x8-10 @ RPE 8')).toBeInTheDocument();
    expect(screen.getByText('Mittwoch: Unterkörper')).toBeInTheDocument();
  });

  it('renders HTML content when provided', () => {
    render(<TrainingPlanCard plan={[]} htmlContent={mockHtmlContent} />);
    
    expect(screen.getByText('✅ Trainingsplan erstellt')).toBeInTheDocument();
    expect(screen.getByText('Kraft-Aufbau Plan')).toBeInTheDocument();
  });

  it('shows action buttons when callbacks provided', () => {
    const mockConfirm = vi.fn();
    const mockReject = vi.fn();
    
    render(
      <TrainingPlanCard 
        plan={mockPlan} 
        onConfirm={mockConfirm}
        onReject={mockReject}
      />
    );
    
    const confirmButton = screen.getByText('✔︎ Plan übernehmen');
    const rejectButton = screen.getByText('✕ Verwerfen');
    
    expect(confirmButton).toBeInTheDocument();
    expect(rejectButton).toBeInTheDocument();
    
    fireEvent.click(confirmButton);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    
    fireEvent.click(rejectButton);
    expect(mockReject).toHaveBeenCalledTimes(1);
  });

  it('limits displayed exercises to 2 per day', () => {
    render(<TrainingPlanCard plan={mockPlan} />);
    
    // Should show only first 2 exercises for Monday
    expect(screen.getByText('Bankdrücken - 3x8-10 @ RPE 8')).toBeInTheDocument();
    expect(screen.getByText('Klimmzüge - 3x5-8 @ RPE 7')).toBeInTheDocument();
    expect(screen.getByText('+1 weitere Übungen')).toBeInTheDocument();
  });

  it('limits displayed days to 3', () => {
    render(<TrainingPlanCard plan={mockPlan} />);
    
    expect(screen.getByText('Montag: Oberkörper')).toBeInTheDocument();
    expect(screen.getByText('Mittwoch: Unterkörper')).toBeInTheDocument();
    expect(screen.getByText('Freitag: Ganzkörper')).toBeInTheDocument();
  });

  it('sanitizes HTML content', () => {
    const maliciousHtml = '<script>alert("xss")</script><p>Safe content</p>';
    
    render(<TrainingPlanCard plan={[]} htmlContent={maliciousHtml} />);
    
    // Script should be removed, but p tag should remain
    expect(screen.getByText('Safe content')).toBeInTheDocument();
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('matches snapshot for structured plan', () => {
    const { container } = render(<TrainingPlanCard plan={mockPlan} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for HTML content', () => {
    const { container } = render(
      <TrainingPlanCard plan={[]} htmlContent={mockHtmlContent} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});