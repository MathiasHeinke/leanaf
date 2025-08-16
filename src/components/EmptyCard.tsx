import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Database } from "lucide-react";

interface EmptyCardProps {
  title: string;
  subtitle?: string;
  isError?: boolean;
  className?: string;
}

export function EmptyCard({ title, subtitle, isError = false, className }: EmptyCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          {isError ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Database className="h-5 w-5" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {subtitle || "Noch keine Daten verfügbar"}
        </p>
      </CardContent>
    </Card>
  );
}