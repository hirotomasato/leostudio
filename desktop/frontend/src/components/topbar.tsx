import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

// Slim topbar: page title, optional contextual slot (e.g. balance pill),
// theme switcher.
export function Topbar({
  title,
  rightSlot,
}: {
  title: string;
  rightSlot?: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-background/70 px-6 py-3 backdrop-blur">
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        {rightSlot}
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {OPTIONS.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition",
                theme === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={t(`${label} theme`)}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
