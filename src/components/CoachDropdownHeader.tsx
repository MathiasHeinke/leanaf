import { ArrowLeftIcon, Trash2Icon, Clock3Icon } from "lucide-react";

export default function CoachDropdownHeader({
  onBack,
  avatarUrl,
  name,
  onDelete,
  onHistory,
}: {
  onBack: () => void;
  avatarUrl: string;
  name: string;
  onDelete: () => void;
  onHistory: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border shadow-md transition-all duration-300">
      <button onClick={onBack} className="p-2 rounded hover:bg-muted">
        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2">
        <img
          src={avatarUrl}
          alt={name}
          className="w-8 h-8 rounded-full object-cover"
        />
        <span className="text-sm font-medium text-foreground">{name}</span>
      </div>

      <div className="flex gap-2">
        <button onClick={onHistory} className="p-2 rounded hover:bg-muted">
          <Clock3Icon className="w-5 h-5 text-muted-foreground" />
        </button>
        <button onClick={onDelete} className="p-2 rounded hover:bg-destructive/10">
          <Trash2Icon className="w-5 h-5 text-destructive" />
        </button>
      </div>
    </div>
  );
}