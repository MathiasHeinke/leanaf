import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserIcon, 
  MoveVerticalIcon, 
  ArrowRightIcon, 
  ArrowLeftIcon,
  HelpCircleIcon 
} from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  photoCounts?: {
    front: number;
    back: number;
    side_left: number;
    side_right: number;
    unspecified: number;
  };
}

const categories = [
  {
    id: 'front',
    label: 'Front',
    icon: UserIcon,
    description: 'Frontansicht'
  },
  {
    id: 'back',
    label: 'Rücken',
    icon: MoveVerticalIcon,
    description: 'Rückansicht'
  },
  {
    id: 'side_left',
    label: 'Links',
    icon: ArrowLeftIcon,
    description: 'Seitlich links'
  },
  {
    id: 'side_right',
    label: 'Rechts',
    icon: ArrowRightIcon,
    description: 'Seitlich rechts'
  },
  {
    id: 'unspecified',
    label: 'Sonstige',
    icon: HelpCircleIcon,
    description: 'Nicht kategorisiert'
  }
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
  photoCounts
}) => {
  return (
    <div className="space-y-3">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-1">Bildkategorien</h3>
        <p className="text-sm text-muted-foreground">
          Verfolge deinen Fortschritt aus verschiedenen Blickwinkeln
        </p>
      </div>
      
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          const count = photoCounts?.[category.id as keyof typeof photoCounts] || 0;
          const isSelected = selectedCategory === category.id;
          
          return (
            <Button
              key={category.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className={`
                relative flex items-center gap-2 transition-all duration-200
                ${isSelected 
                  ? 'ring-2 ring-primary/20 shadow-lg' 
                  : 'hover:shadow-md hover:scale-105'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{category.label}</span>
              
              {count > 0 && (
                <Badge 
                  variant={isSelected ? "secondary" : "default"}
                  className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
      
      {/* Selected category description */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          {categories.find(c => c.id === selectedCategory)?.description}
        </p>
      </div>
    </div>
  );
};