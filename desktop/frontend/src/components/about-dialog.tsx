import { useEffect, useState } from "react";
import { Sparkles, Github, ExternalLink } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { api, type AppInfo } from "@/lib/api";

// About modal — shown from the sidebar footer. Keeps copy minimal, only
// surfaces version, author, and repo link.
export function AboutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    api
      .appInfo()
      .then(setInfo)
      .catch(() => undefined);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title={t("About")}>
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Sparkles className="h-7 w-7" strokeWidth={2.4} />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">{info?.name ?? "LeoStudio"}</p>
          <p className="text-xs text-muted-foreground">
            v{info?.version ?? "—"}
          </p>
        </div>

        <div className="w-full space-y-1.5 text-xs text-muted-foreground">
          <Row label={t("Author")} value={info?.author} />
          <Row label={t("License")} value={info?.license} />
          <Row label={t("Built with")} value="Wails · Go · React" />
        </div>

        <div className="flex w-full items-center gap-2">
          {info?.repository ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => api.openURL(info.repository)}
            >
              <Github className="h-3.5 w-3.5" />
              {t("Repository")}
              <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
            </Button>
          ) : null}
          <Button size="sm" className="flex-1" onClick={onClose}>
            {t("Close")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between rounded border border-border/60 bg-card/40 px-3 py-1.5">
      <span>{label}</span>
      <span className="text-foreground">{value ?? "—"}</span>
    </div>
  );
}
