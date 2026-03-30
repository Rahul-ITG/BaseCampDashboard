import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  label,
  value,
  subtitle,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-7">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconBg
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div className="space-y-1">
            <p className="label-uppercase">{label}</p>
            <p className="text-3xl font-bold tracking-tight">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
