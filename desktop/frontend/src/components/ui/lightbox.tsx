import { useEffect, useRef, useState } from "react";
import { X, ExternalLink, Download, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

// Full-screen preview for image and video assets. Detects video by extension
// so we render the right element with native controls + autoplay. Includes a
// download button that goes through the Wails save dialog so users can pick
// where the file lands on their machine.
export function Lightbox({
  url,
  onClose,
}: {
  url: string | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (url && !el.open) el.showModal();
    if (!url && el.open) el.close();
  }, [url]);

  if (!url) return null;
  const isVideo = /\.(mp4|webm|mov)(?:$|\?)/i.test(url);

  // Suggest filename derived from the URL path so saved files keep their
  // original extension and Leonardo prompt slug.
  const suggestedName = url.split("?")[0]?.split("/").pop() ?? "leonardo-asset";

  const onDownload = async () => {
    setDownloading(true);
    try {
      const saved = await api.downloadAsset(url, suggestedName);
      if (saved) {
        showSuccess(t("Saved {value}", { value: saved }));
      }
    } catch (err) {
      showError(`${t("Download failed")}: ${(err as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="bg-transparent p-0 text-foreground backdrop:bg-black/85"
    >
      <div className="flex max-h-[92vh] max-w-[92vw] flex-col items-center gap-3">
        {isVideo ? (
          <video
            src={url}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-lg shadow-2xl"
          />
        ) : (
          <img
            src={url}
            alt={t("Preview")}
            className="max-h-[80vh] max-w-full rounded-lg shadow-2xl"
          />
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow ring-1 ring-primary/40 transition hover:bg-primary/90 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {downloading ? t("Saving…") : t("Download")}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-card/80 px-3 py-1.5 text-xs text-foreground shadow ring-1 ring-border backdrop-blur transition hover:bg-card"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("Open")}
          </a>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md bg-card/80 px-3 py-1.5 text-xs text-foreground shadow ring-1 ring-border backdrop-blur transition hover:bg-card"
          >
            <X className="h-3.5 w-3.5" />
            {t("Close")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
