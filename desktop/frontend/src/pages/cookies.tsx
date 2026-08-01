import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Plus,
  Pencil,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Power,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api, type Cookie, type CookieHealth } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useWailsEvent } from "@/lib/events";

export function CookiesPage() {
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();

  const [cookies, setCookies] = useState<Cookie[] | null>(null);
  const [health, setHealth] = useState<CookieHealth | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [rawCookie, setRawCookie] = useState("");
  const [editing, setEditing] = useState<Cookie | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [list, summary] = await Promise.all([
        api.listCookies(),
        api.cookieHealth(),
      ]);
      setCookies(list);
      setHealth(summary);
    } catch (err) {
      showError(`${t("Load failed")}: ${(err as Error).message}`);
    }
  }, [showError, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Auto-refetch when backend signals balance changed (after generate runs).
  useWailsEvent("cookies:changed", () => {
    void reload();
  });

  // Periodic auto-refresh: while the Cookies page is open, re-fetch every
  // cookie's balance from Leonardo so the pool always reflects live numbers
  // without the user clicking Refresh. Silent + best-effort; skipped while a
  // manual refresh is in flight to avoid overlapping calls.
  useEffect(() => {
    const POLL_MS = 60_000;
    const timer = setInterval(() => {
      if (document.hidden) return;
      void (async () => {
        try {
          await api.refreshCookieProfiles();
          await reload();
        } catch {
          /* ignore transient refresh errors */
        }
      })();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const onAdd = async () => {
    const value = rawCookie.trim();
    if (!value) {
      showError(t("Paste a full cookie string before saving."));
      return;
    }
    setAdding(true);
    try {
      const res = await api.addCookie(value);
      showSuccess(t("Cookie saved: {account} · balance {balance}", {
        account: res.email || t("account"),
        balance: res.balance.toLocaleString(),
      }));
      setRawCookie("");
      await reload();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const onRefreshAll = async () => {
    setRefreshing(true);
    try {
      const res = await api.refreshCookieProfiles();
      showSuccess(t("Refresh complete: {ok}/{checked} succeeded", res));
      await reload();
    } catch (err) {
      showError(`${t("Refresh failed")}: ${(err as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const onToggle = async (cookie: Cookie) => {
    try {
      await api.toggleCookie(cookie.id, !cookie.is_active);
      await reload();
    } catch (err) {
      showError((err as Error).message);
    }
  };

  const onDelete = async (cookie: Cookie) => {
    if (!confirm(t("Delete cookie #{id} ({email})?", {
      id: cookie.id,
      email: cookie.email || t("no email"),
    }))) {
      return;
    }
    try {
      await api.deleteCookie(cookie.id);
      showSuccess(t("Cookie #{id} deleted.", { id: cookie.id }));
      await reload();
    } catch (err) {
      showError((err as Error).message);
    }
  };

  const onEdit = (cookie: Cookie) => {
    setEditing(cookie);
    setEditValue("");
  };

  const onSubmitEdit = async () => {
    if (!editing) return;
    const value = editValue.trim();
    if (!value) {
      showError(t("Paste the new cookie first."));
      return;
    }
    setEditSaving(true);
    try {
      const res = await api.updateCookie(editing.id, value);
      showSuccess(t("Cookie #{id} updated · balance {balance}", {
        id: editing.id,
        balance: res.balance.toLocaleString(),
      }));
      setEditing(null);
      setEditValue("");
      await reload();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-6">
        <Stats health={health} />

      <Card>
        <div className="flex items-center justify-between p-5 pb-3">
          <CardTitle className="text-base">{t("Add cookie")}</CardTitle>
        </div>
        <CardContent className="space-y-3 pt-0">
          <Textarea
            value={rawCookie}
            onChange={(e) => setRawCookie(e.target.value)}
            placeholder="cookie=...&#10;token=... (optional)"
            className="min-h-[120px] font-mono text-xs"
            spellCheck={false}
          />
          <div className="flex justify-end">
            <Button onClick={onAdd} disabled={adding || !rawCookie.trim()}>
              {adding ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {adding ? t("Validating") : t("Add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="flex items-center justify-between p-5 pb-2">
          <CardTitle className="text-base">
            {t("Cookie pool")}
            {cookies !== null ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {cookies.length}
              </span>
            ) : null}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshAll}
            disabled={refreshing || (cookies?.length ?? 0) === 0}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {t("Refresh")}
          </Button>
        </div>
        <CardContent className="pt-0">
          {cookies === null ? (
            <CookiesSkeleton />
          ) : cookies.length === 0 ? (
            <EmptyPool />
          ) : (
            <div className="space-y-2">
              {cookies.map((c) => (
                <CookieRow
                  key={c.id}
                  cookie={c}
                  onToggle={() => onToggle(c)}
                  onDelete={() => onDelete(c)}
                  onEdit={() => onEdit(c)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `${t("Update cookie")} #${editing.id}` : t("Update cookie")}
        description={editing?.email ? editing.email : undefined}
      >
        <div className="space-y-3">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="cookie=...&#10;token=..."
            className="min-h-[140px] font-mono text-xs"
            spellCheck={false}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
              disabled={editSaving}
            >
              {t("Cancel")}
            </Button>
            <Button
              size="sm"
              onClick={onSubmitEdit}
              disabled={editSaving || !editValue.trim()}
            >
              {editSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
              {t("Update")}
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
    </div>
  );
}

function Stats({ health }: { health: CookieHealth | null }) {
  const { t } = useTranslation();
  const cards = useMemo(
    () => [
      {
        label: t("Active balance"),
        value: health ? health.active_balance.toLocaleString() : null,
        icon: Wallet,
        tint: "from-violet-500/30 to-violet-500/0 text-violet-300",
      },
      {
        label: t("Ready accounts"),
        value: health ? `${health.ready}` : null,
        icon: ShieldCheck,
        tint: "from-emerald-500/30 to-emerald-500/0 text-emerald-300",
      },
      {
        label: t("Depleted"),
        value: health ? `${health.depleted}` : null,
        icon: ShieldAlert,
        tint: "from-amber-500/30 to-amber-500/0 text-amber-300",
      },
      {
        label: t("Disabled"),
        value: health ? `${health.disabled}` : null,
        icon: Power,
        tint: "from-slate-500/30 to-slate-500/0 text-slate-300",
      },
    ],
    [health, t]
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tint }) => (
        <Card
          key={label}
          className="overflow-hidden transition hover:border-primary/30"
        >
          <div className="relative px-4 py-4">
            <div
              className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-bl ${tint} blur-2xl`}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                {value === null ? (
                  <Skeleton className="mt-2 h-7 w-20" />
                ) : (
                  <p className="mt-1 text-2xl font-semibold tracking-tight">
                    {value}
                  </p>
                )}
              </div>
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: Cookie["status"] }) {
  const { t } = useTranslation();
  if (status === "READY") return <Badge tone="success">{t("Ready")}</Badge>;
  if (status === "DEPLETED") return <Badge tone="warning">{t("Depleted")}</Badge>;
  return <Badge tone="neutral">{t("Disabled")}</Badge>;
}

function CookieRow({
  cookie,
  onToggle,
  onDelete,
  onEdit,
}: {
  cookie: Cookie;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const last = cookie.last_checked_at
    ? new Date(cookie.last_checked_at * 1000).toLocaleString()
    : "—";
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 px-4 py-3 transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {cookie.email || `Cookie #${cookie.id}`}
          </span>
          <StatusBadge status={cookie.status} />
          {cookie.disabled_reason ? (
            <Badge tone="danger">{cookie.disabled_reason}</Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {t("balance")} {" "}
          <span className="font-medium text-foreground">
            {cookie.last_balance.toLocaleString()}
          </span>
          {" · "}{t("last checked")} {last}
          {cookie.last_error ? (
            <>
              {" · "}
              <span className="text-red-300">{cookie.last_error}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          aria-label={cookie.is_active ? t("Disable") : t("Enable")}
        >
          {cookie.is_active ? (
            <ToggleRight className="h-4 w-4 text-emerald-400" />
          ) : (
            <ToggleLeft className="h-4 w-4" />
          )}
          <span className="text-xs">
            {cookie.is_active ? t("Active") : t("Disabled")}
          </span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={t("Edit cookie")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label={t("Delete cookie")}
        >
          <Trash2 className="h-4 w-4 text-red-300" />
        </Button>
      </div>
    </div>
  );
}

function CookiesSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyPool() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <KeyRound className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">{t("No cookies")}</p>
    </div>
  );
}
