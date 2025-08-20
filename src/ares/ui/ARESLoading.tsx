export default function ARESLoading({ label = 'Laden…' }: { label?: string }) {
  return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{label}</div>;
}