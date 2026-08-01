import { useCallback, useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { api, type CookieHealth } from "@/lib/api";
import { useWailsEvent } from "@/lib/events";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Compact balance indicator. Lives near the top of generate pages so users
// can see remaining credit without leaving Compose. Auto-refreshes when
// the backend emits "cookies:changed" (e.g. after generate finishes).
export function BalancePill({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [health, setHealth] = useState<CookieHealth | null>(null);
  const [pulse, setPulse] = useState(false);

  const reload = useCallback(async () => {
    try {
      const h = await api.cookieHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Refetch + brief pulse animation when backend says cookies updated.
  useWailsEvent("cookies:changed", () => {
    void reload();
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  });

  if (health === null) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs transition",
        pulse && "border-primary/60 bg-primary/10",
        className
      )}
      title={`${health.ready} ${t("Ready")} · ${health.depleted} ${t("Depleted")}`}
    >
      <Wallet
        className={cn(
          "h-3.5 w-3.5 transition",
          pulse ? "text-primary" : "text-muted-foreground"
        )}
      />
      <span className="font-medium">
        {health.active_balance.toLocaleString()}
      </span>
      <span className="text-[10px] text-muted-foreground">{t("credits")}</span>
    </div>
  );
}
