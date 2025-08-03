import DOMPurify from 'dompurify';
import { SmartCard } from './SmartCard';
import { CardDiary } from './CardDiary';
import { CardMeal } from './CardMeal';
import { CardGoalCheckin } from './CardGoalCheckin';
import { WorkoutPlanDraftCard } from './WorkoutPlanDraftCard';

export const SmartCardWrapper = ({ card, payload }: any) => {
  switch (card) {
    case 'supplement':
      return (
        <SmartCard
          tool="supplement"
          icon="💊"
          title="Supplement-Empfehlung"
          defaultCollapsed
          actions={payload?.actions}
        >
          {payload?.html ? (
            <div dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(payload.html, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span'],
                ALLOWED_ATTR: ['class'],
                FORBID_TAGS: ['script', 'object', 'embed', 'base', 'link'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style']
              })
            }} />
          ) : (
            <div>{JSON.stringify(payload, null, 2)}</div>
          )}
        </SmartCard>
      );
    
    case 'weight':
      return (
        <SmartCard
          tool="gewicht"
          icon="⚖️"
          title="Gewichtseintrag"
          defaultCollapsed
          actions={payload?.actions}
        >
          <div className="text-center">
            <span className="text-2xl font-bold">{payload?.value} {payload?.unit}</span>
            {payload?.ts && (
              <div className="text-sm text-muted-foreground mt-1">
                {new Date(payload.ts).toLocaleString()}
              </div>
            )}
          </div>
        </SmartCard>
      );
    
    case 'workout_plan':
    case 'plan':
      return (
        <SmartCard
          tool="trainingsplan"
          icon="📋"
          title="Trainingsplan"
          defaultCollapsed
          actions={payload?.actions}
        >
          {payload?.html ? (
            <div dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(payload.html, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span'],
                ALLOWED_ATTR: ['class'],
                FORBID_TAGS: ['script', 'object', 'embed', 'base', 'link'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style']
              })
            }} />
          ) : (
            <div>{JSON.stringify(payload, null, 2)}</div>
          )}
        </SmartCard>
      );
    
    case 'exercise':
      return (
        <SmartCard
          tool="uebung"
          icon="🏋️"
          title="Übung"
          defaultCollapsed
          actions={payload?.actions}
        >
          {payload?.html ? (
            <div dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(payload.html, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span'],
                ALLOWED_ATTR: ['class'],
                FORBID_TAGS: ['script', 'object', 'embed', 'base', 'link'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style']
              })
            }} />
          ) : (
            <div>{JSON.stringify(payload, null, 2)}</div>
          )}
        </SmartCard>
      );

    case 'quickworkout':
      return (
        <SmartCard
          tool="quickworkout"
          icon="🏃"
          title="Quick-Workout"
          defaultCollapsed
          actions={payload?.actions}
        >
          {payload?.html ? (
            <div dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(payload.html, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span'],
                ALLOWED_ATTR: ['class'],
                FORBID_TAGS: ['script', 'object', 'embed', 'base', 'link'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style']
              })
            }} />
          ) : (
            <div className="space-y-2">
              <p><strong>{payload?.description}</strong></p>
              {payload?.steps && <p>📱 {payload.steps} Schritte</p>}
              {payload?.distance && <p>📏 {payload.distance} km</p>}
              {payload?.duration && <p>⏱️ {payload.duration} Minuten</p>}
            </div>
          )}
        </SmartCard>
      );

    case 'foto':
      return (
        <SmartCard
          tool="foto"
          icon="📸"
          title="Foto-Analyse"
          defaultCollapsed
          actions={payload?.actions}
        >
          {payload?.html ? (
            <div dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(payload.html, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span'],
                ALLOWED_ATTR: ['class'],
                FORBID_TAGS: ['script', 'object', 'embed', 'base', 'link'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style']
              })
            }} />
          ) : (
            <div>{JSON.stringify(payload, null, 2)}</div>
          )}
        </SmartCard>
      );
    
    case 'mindset':
      return (
        <SmartCard
          tool="mindset"
          icon="🧠"
          title="Mindset-Tipp"
          defaultCollapsed
          actions={payload?.actions}
        >
          {payload?.html ? (
            <div dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(payload.html, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span'],
                ALLOWED_ATTR: ['class'],
                FORBID_TAGS: ['script', 'object', 'embed', 'base', 'link'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style']
              })
            }} />
          ) : (
            <div>{JSON.stringify(payload, null, 2)}</div>
          )}
        </SmartCard>
      );
    
    case 'diary':
      return <CardDiary payload={payload} />;
    
    case 'meal':
      return <CardMeal payload={payload} />;
    
    case 'goalCheckin':
      return <CardGoalCheckin payload={payload} />;
    
    case 'workout_plan_draft':
      return <WorkoutPlanDraftCard {...payload} />;
    
    default:
      return (
        <SmartCard
          tool="chat"
          icon="❓"
          title="Unbekannter Kartentyp"
          defaultCollapsed
        >
          <div>Card type: {card}</div>
          <div>{JSON.stringify(payload, null, 2)}</div>
        </SmartCard>
      );
  }
};