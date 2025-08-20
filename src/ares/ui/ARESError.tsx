export default function ARESError({ text }: { text: string }) {
  return <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">{text}</div>;
}