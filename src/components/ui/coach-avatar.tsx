import { cn } from "@/lib/utils";

interface CoachAvatarProps {
  src: string;
  alt: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const CoachAvatar = ({ 
  src, 
  alt, 
  fallback = "C", 
  size = "md", 
  className 
}: CoachAvatarProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-12 h-12"
  };

  return (
    <div className={cn(
      "rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0",
      sizeClasses[size],
      className
    )}>
      <img 
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<span class="text-primary font-semibold text-sm">${fallback}</span>`;
          }
        }}
      />
    </div>
  );
};