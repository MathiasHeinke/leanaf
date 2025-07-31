import { SmartCard } from './SmartCard';

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
            <div dangerouslySetInnerHTML={{ __html: payload.html }} />
          ) : (
            <div>{JSON.stringify(payload, null, 2)}</div>
          )}
        </SmartCard>
      );
    
    case 'weight':
      return (
        <SmartCard
          tool="exercise"
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
    
    case 'plan':
      return (
        <SmartCard
          tool="plan"
          icon="📋"
          title="Trainingsplan"
          defaultCollapsed
          actions={payload?.actions}
        >
          {payload?.html ? (
            <div dangerouslySetInnerHTML={{ __html: payload.html }} />
          ) : (
            <div>{JSON.stringify(payload, null, 2)}</div>
          )}
        </SmartCard>
      );
    
    case 'exercise':
      return (
        <SmartCard
          tool="exercise"
          icon="🏋️"
          title="Übung"
          defaultCollapsed
          actions={payload?.actions}
        >
          {payload?.html ? (
            <div dangerouslySetInnerHTML={{ __html: payload.html }} />
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
            <div dangerouslySetInnerHTML={{ __html: payload.html }} />
          ) : (
            <div>{JSON.stringify(payload, null, 2)}</div>
          )}
        </SmartCard>
      );
    
    default:
      return (
        <SmartCard
          tool="supplement"
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