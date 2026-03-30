import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarGroupProps {
  people: { name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export function AvatarGroup({
  people,
  max = 3,
  size = "sm",
  className,
}: AvatarGroupProps) {
  const visible = people.slice(0, max);
  const overflow = people.length - max;

  const sizeClasses = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visible.map((person, i) => (
        <Avatar
          key={i}
          className={cn(
            sizeClasses,
            "ring-2 ring-card"
          )}
        >
          {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt={person.name} />}
          <AvatarFallback className={cn(sizeClasses, "bg-muted text-muted-foreground font-medium")}>
            {person.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            sizeClasses,
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-card"
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
