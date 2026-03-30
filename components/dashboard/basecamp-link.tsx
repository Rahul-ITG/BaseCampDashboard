import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface BasecampLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function BasecampLink({ href, children, className }: BasecampLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 font-medium hover:text-primary transition-colors",
        className
      )}
    >
      <span>{children}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
    </a>
  );
}
