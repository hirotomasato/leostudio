import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Library as LibraryIcon,
  Clock,
  Wand2,
  ImageIcon,
  Repeat,
  Search,
  Play,
  Pause,
  Maximize2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lightbox } from "@/components/ui/lightbox";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { api, type GenerationLog } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useWailsEvent } from "@/lib/events";
import { setReplay } from "@/lib/replay";
import type { NavId } from "@/components/sidebar";

type FilterMode = "all" | "image" | "video";

function isVideoLog(log: GenerationLog) {
  return log.imageURLs.some((u) => /\.(mp4|webm|mov)(?:$|\?)/i.test(u));
}

export function LibraryPage({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();
  const [logs, setLogs] = useState<GenerationLog[] | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const reload = useCallback(async () => {
    try {
      const list = await api.listGenerationLogs(200);
      setLogs(list);
    } catch (err) {
      showError(`${t("Load failed")}: ${(err as Error).message}`);
    }
  }, [showError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Refetch when a new generation is logged.
  useWailsEvent("cookies:changed", () => {
    void reload();
  });

  const onReplayLog = (log: GenerationLog) => {
    const target = isVideoLog(log) ? "video" : "image";
    setReplay({
      target,
      prompt: log.prompt,
      aspectRatio: log.aspectRatio || undefined,
      modelId: log.modelID,
    });
    showSuccess(
      target === "video"
        ? t("Generate Video")
        : t("Generate Image")
    );
    onNavigate(target);
  };

  // Filter + search filter the local list so typing feels instant.
  const filtered = useMemo(() => {
    if (logs === null) return null;
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const isVid = isVideoLog(log);
      if (filter === "image" && isVid) return false;
      if (filter === "video" && !isVid) return false;
      if (!q) return true;
      return (
        log.prompt.toLowerCase().includes(q) ||
        log.modelID.toLowerCase().includes(q) ||
        log.providerGenerationID.toLowerCase().includes(q)
      );
    });
  }, [logs, search, filter]);

  if (logs === null) {
    return <LibrarySkeleton />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-6">
        <FilterBar
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilter={setFilter}
          counts={{
            all: logs.length,
            image: logs.filter((l) => !isVideoLog(l)).length,
            video: logs.filter((l) => isVideoLog(l)).length,
          }}
        />
        {filtered === null || filtered.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <div className="space-y-3">
            {filtered.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                onReplay={() => onReplayLog(log)}
                onPreview={(url) => setPreviewURL(url)}
              />
            ))}
          </div>
        )}
      </div>
      <Lightbox url={previewURL} onClose={() => setPreviewURL(null)} />
    </div>
  );
}

function FilterBar({
  search,
  onSearch,
  filter,
  onFilter,
  counts,
}: {
  search: string;
  onSearch: (v: string) => void;
  filter: FilterMode;
  onFilter: (m: FilterMode) => void;
  counts: { all: number; image: number; video: number };
}) {
  const { t } = useTranslation();
  const tabs: Array<{ id: FilterMode; label: string; count: number }> = [
    { id: "all", label: t("All"), count: counts.all },
    { id: "image", label: t("Image"), count: counts.image },
    { id: "video", label: t("Video"), count: counts.video },
  ];
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("Search prompt, model, gen id…")}
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onFilter(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs transition",
              filter === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{t.label}</span>
            <span className="text-[10px] opacity-70">{t.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LogCard({
  log,
  onReplay,
  onPreview,
}: {
  log: GenerationLog;
  onReplay: () => void;
  onPreview: (url: string) => void;
}) {
  const created = new Date(log.createdAt * 1000).toLocaleString();
  const { t } = useTranslation();
  const isVideo = isVideoLog(log);
  return (
    <Card className="transition hover:border-primary/30">
      <div className="flex flex-col gap-4 p-4 md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-2 md:w-56">
          <ThumbnailGrid log={log} onPreview={onPreview} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone={isVideo ? "info" : "neutral"}>
              {isVideo ? t("Video") : t("Image")}
            </Badge>
            <Badge tone={log.status === "success" ? "success" : "danger"}>
              {log.status}
            </Badge>
            {log.aspectRatio && <Badge tone="neutral">{log.aspectRatio}</Badge>}
            <span className="text-[11px] text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              {created}
            </span>
          </div>
          <p className="line-clamp-3 text-sm">{log.prompt}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            <Wand2 className="mr-1 inline h-3 w-3" />
            {log.modelID}
            {" · "}cookie #{log.usedCookieID}
            {" · "}gen {log.providerGenerationID.slice(0, 8)}
          </p>
          {log.errorMessage && (
            <p className="mt-1 text-[11px] text-red-300">{log.errorMessage}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={onReplay}>
              <Repeat className="h-3.5 w-3.5" />
              {t("Use prompt")}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ThumbnailGrid({
  log,
  onPreview,
}: {
  log: GenerationLog;
  onPreview: (url: string) => void;
}) {
  const { t } = useTranslation();
  const items = log.imageURLs.slice(0, 4);
  if (items.length === 0) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded bg-accent text-muted-foreground">
        <ImageIcon className="h-6 w-6" />
      </div>
    );
  }
  return (
    <div className="grid w-full grid-cols-2 gap-1">
      {items.map((u, i) =>
        /\.(mp4|webm|mov)(?:$|\?)/i.test(u) ? (
          <InlineVideoTile key={i} url={u} onPreview={() => onPreview(u)} />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onPreview(u)}
            className="overflow-hidden rounded transition hover:ring-2 hover:ring-primary"
            aria-label={t("Preview image")}
          >
            <img
              src={u}
              alt=""
              className="aspect-square w-full object-cover"
              loading="lazy"
            />
          </button>
        )
      )}
    </div>
  );
}

// Inline video tile with click-to-play. Mute by default so multiple cards
// can autoplay without audio chaos. Hover reveals overlay buttons.
function InlineVideoTile({
  url,
  onPreview,
}: {
  url: string;
  onPreview: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const { t } = useTranslation();
  const videoRef = useMemo(() => ({ current: null as HTMLVideoElement | null }), []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded">
      <video
        ref={(el) => (videoRef.current = el)}
        src={url}
        className="aspect-square w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/30 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-full bg-background/90 p-2 text-foreground shadow-lg transition hover:scale-105"
          aria-label={playing ? t("Pause") : t("Play")}
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="rounded-full bg-background/90 p-2 text-foreground shadow-lg transition hover:scale-105"
          aria-label={t("Open fullscreen")}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-3 p-6">
        <Skeleton className="h-9 w-full max-w-sm" />
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <div className="flex gap-4 p-4">
              <Skeleton className="h-32 w-32 shrink-0 rounded" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="mt-auto h-3 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyLibrary() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <LibraryIcon className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold">{t("No results")}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("Try changing the filter or clearing the search box.")}
      </p>
    </div>
  );
}
