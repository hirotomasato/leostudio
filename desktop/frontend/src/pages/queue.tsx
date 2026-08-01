import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  ImageIcon,
  Video,
  Plus,
  Trash2,
  Copy,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  Eraser,
  Send,
} from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lightbox } from "@/components/ui/lightbox";
import { ImageDropzone, type DroppedImage } from "@/components/image-dropzone";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  api,
  type AspectRatioOption,
  type ImageModel,
  type VideoModel,
  type QueueJob,
  type QueueJobSpec,
} from "@/lib/api";
import { useWailsEvent } from "@/lib/events";
import { useTranslation } from "@/lib/i18n";

const VIDEO_ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];

type SubTab = "image" | "video";

// A local draft holds a fully-resolved spec plus reference previews so the
// draft list can render thumbnails. References are pre-uploaded, so each draft
// already owns its own init image ids — they never get mixed between jobs.
type Draft = {
  localId: string;
  type: SubTab;
  prompt: string;
  modelId: string;
  modelLabel: string;
  aspectRatio: string;
  quantity: number; // image
  resolution: string; // video
  duration: number; // video
  audio: boolean; // video
  refs: DroppedImage[];
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function QueuePage() {
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();
  const [tab, setTab] = useState<SubTab>("image");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const reloadJobs = useCallback(async () => {
    try {
      setJobs(await api.listQueueJobs());
    } catch (err) {
      showError(`${t("Loaded queue failed")}: ${(err as Error).message}`);
    }
  }, [showError, t]);

  useEffect(() => {
    void reloadJobs();
  }, [reloadJobs]);

  // Live updates: backend emits queue:changed on every job transition.
  useWailsEvent("queue:changed", () => {
    void reloadJobs();
  });

  const addDraft = (draft: Draft) => setDrafts((prev) => [...prev, draft]);
  const removeDraft = (id: string) =>
    setDrafts((prev) => prev.filter((d) => d.localId !== id));
  const duplicateDraft = (id: string) =>
    setDrafts((prev) => {
      const found = prev.find((d) => d.localId === id);
      if (!found) return prev;
      return [...prev, { ...found, localId: uid() }];
    });

  const onSubmit = async () => {
    if (drafts.length === 0) return;
    const specs: QueueJobSpec[] = drafts.map((d) => ({
      type: d.type,
      prompt: d.prompt,
      modelId: d.modelId,
      aspectRatio: d.aspectRatio,
      resolution: d.type === "video" ? d.resolution : undefined,
      duration: d.type === "video" ? d.duration : undefined,
      audio: d.type === "video" ? d.audio : undefined,
      quantity: d.type === "image" ? d.quantity : undefined,
      refImageIds: d.refs
        .filter((r) => r.source === "uploaded" && r.imageId)
        .map((r) => r.imageId as string),
    }));
    try {
      await api.enqueueJobs(specs);
      showSuccess(t("Added {count} jobs to queue", { count: specs.length }));
      setDrafts([]);
      void reloadJobs();
    } catch (err) {
      showError((err as Error).message);
    }
  };

  return (
    <div className="grid h-full grid-cols-1 gap-6 overflow-hidden p-6 lg:grid-cols-[440px_minmax(0,1fr)]">
      {/* Left: compose + drafts */}
      <div className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto">
        <SubTabs tab={tab} onChange={setTab} />
        {tab === "image" ? (
          <ImageCompose onAdd={addDraft} />
        ) : (
          <VideoCompose onAdd={addDraft} />
        )}
        <DraftList
          drafts={drafts}
          onRemove={removeDraft}
          onDuplicate={duplicateDraft}
          onSubmit={onSubmit}
        />
      </div>

      {/* Right: live queue */}
      <QueueList jobs={jobs} onPreview={setPreview} onChanged={reloadJobs} />

      <Lightbox url={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function SubTabs({ tab, onChange }: { tab: SubTab; onChange: (t: SubTab) => void }) {
  const { t } = useTranslation();
  const tabs: Array<{ id: SubTab; label: string; icon: typeof ImageIcon }> = [
    { id: "image", label: "Image", icon: ImageIcon },
    { id: "video", label: "Video", icon: Video },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm transition",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(t.label)}
          </button>
        );
      })}
    </div>
  );
}

// ---- Image compose --------------------------------------------------------

function ImageCompose({ onAdd }: { onAdd: (d: Draft) => void }) {
  const { showError } = useToast();
  const { t } = useTranslation();
  const [models, setModels] = useState<ImageModel[]>([]);
  const [aspects, setAspects] = useState<AspectRatioOption[]>([]);
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [aspect, setAspect] = useState("1:1");
  const [quantity, setQuantity] = useState(1);
  const [refs, setRefs] = useState<DroppedImage[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [m, a] = await Promise.all([
          api.listImageModels(),
          api.listImageAspects(),
        ]);
        setModels(m);
        setAspects(a);
        const def = m.find((x) => x.isDefault) ?? m[0];
        if (def) setModelId(def.modelId);
      } catch (err) {
        showError(`${t("Loaded image configuration failed")}: ${(err as Error).message}`);
      }
    })();
  }, [showError, t]);

  const add = () => {
    if (!prompt.trim()) {
      showError(t("Prompt cannot be empty."));
      return;
    }
    if (!modelId) {
      showError(t("Select a model first."));
      return;
    }
    const label = models.find((m) => m.modelId === modelId)?.name ?? modelId;
    onAdd({
      localId: uid(),
      type: "image",
      prompt: prompt.trim(),
      modelId,
      modelLabel: label,
      aspectRatio: aspect,
      quantity,
      resolution: "",
      duration: 0,
      audio: false,
      refs,
    });
    // Reset for next entry; references explicitly cleared so the next draft
    // starts fresh (no carry-over of the previous reference image).
    setPrompt("");
    setRefs([]);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 p-5 pb-3">
        <ImageIcon className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">{t("Compose image")}</CardTitle>
      </div>
      <CardContent className="space-y-4 pt-0">
        <Field label={t("Prompt")}>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("A cinematic shot of...")}
            className="min-h-[90px]"
            spellCheck={false}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Model")}>
            <Select value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {models.length === 0 && <option value="">{t("No model")}</option>}
              {models.map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Aspect ratio")}>
            <Select value={aspect} onChange={(e) => setAspect(e.target.value)}>
              {aspects.map((a) => (
                <option key={a.label} value={a.label}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("Quantity · {count}", { count: quantity })}>
          <Slider value={quantity} onValueChange={setQuantity} min={1} max={4} step={1} />
        </Field>
        <ReferenceEditor refs={refs} onChange={setRefs} max={3} />
        <AddButton onClick={add} />
      </CardContent>
    </Card>
  );
}

// ---- Video compose --------------------------------------------------------

function VideoCompose({ onAdd }: { onAdd: (d: Draft) => void }) {
  const { showError } = useToast();
  const { t } = useTranslation();
  const [models, setModels] = useState<VideoModel[]>([]);
  const [prompt, setPrompt] = useState("");
  const [slug, setSlug] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [resolution, setResolution] = useState("RESOLUTION_480");
  const [duration, setDuration] = useState(8);
  const [audio, setAudio] = useState(false);
  const [startFrame, setStartFrame] = useState<DroppedImage | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const list = await api.listVideoModels();
        setModels(list);
        if (list[0]) {
          setSlug(list[0].slug);
          setResolution(list[0].defaultMode);
          setAspect(list[0].defaultAspect);
          setDuration(list[0].defaultDuration);
        }
      } catch (err) {
        showError(`${t("Loaded video models failed")}: ${(err as Error).message}`);
      }
    })();
  }, [showError, t]);

  const selected = useMemo(
    () => models.find((m) => m.slug === slug) ?? null,
    [models, slug]
  );

  const minD = Math.min(...(selected?.durationOptions ?? [4]));
  const maxD = Math.max(...(selected?.durationOptions ?? [15]));

  const add = () => {
    if (!prompt.trim()) {
      showError(t("Prompt cannot be empty."));
      return;
    }
    if (!slug) {
      showError(t("Select a model first."));
      return;
    }
    onAdd({
      localId: uid(),
      type: "video",
      prompt: prompt.trim(),
      modelId: slug,
      modelLabel: slug,
      aspectRatio: aspect,
      quantity: 1,
      resolution,
      duration,
      audio: selected?.supportsAudio ? audio : false,
      refs: startFrame ? [startFrame] : [],
    });
    setPrompt("");
    setStartFrame(null);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 p-5 pb-3">
        <Video className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">{t("Compose video")}</CardTitle>
      </div>
      <CardContent className="space-y-4 pt-0">
        <Field label={t("Prompt")}>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("Cinematic footage of...")}
            className="min-h-[90px]"
            spellCheck={false}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Model")}>
            <Select value={slug} onChange={(e) => setSlug(e.target.value)}>
              {models.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.slug}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Aspect ratio")}>
            <Select value={aspect} onChange={(e) => setAspect(e.target.value)}>
              {VIDEO_ASPECTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("Resolution")}>
          <Select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            {(selected?.supportedModes ?? []).map((m) => (
              <option key={m} value={m}>
                {resolutionLabel(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Duration · {duration}s", { duration })}>
          <Slider
            value={duration}
            onValueChange={(v) => {
              const opts = selected?.durationOptions ?? [];
              const next = opts.reduce(
                (best, val) => (Math.abs(val - v) < Math.abs(best - v) ? val : best),
                opts[0] ?? v
              );
              setDuration(next);
            }}
            min={minD}
            max={maxD}
            step={1}
          />
        </Field>
        {selected?.supportsAudio && (
          <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
            <span className="text-sm">{t("Native audio")}</span>
            <Switch checked={audio} onCheckedChange={setAudio} />
          </div>
        )}
        {selected?.supportsRefImage && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("Start frame")} <span className="text-[10px]">({t("optional")})</span>
            </p>
            <ImageDropzone value={startFrame} onChange={setStartFrame} />
          </div>
        )}
        <AddButton onClick={add} />
      </CardContent>
    </Card>
  );
}

function resolutionLabel(mode: string) {
  if (mode === "RESOLUTION_480") return "480p · SD";
  if (mode === "RESOLUTION_720") return "720p · HD";
  if (mode === "RESOLUTION_1080") return "1080p · FHD";
  return mode;
}

// Up to `max` reference slots; each pre-uploads its own init image id.
function ReferenceEditor({
  refs,
  onChange,
  max,
}: {
  refs: DroppedImage[];
  onChange: (next: DroppedImage[]) => void;
  max: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {t("Reference · {current}/{max}", { current: refs.length, max })}
      </p>
      <div className="space-y-2">
        {refs.map((r, i) => (
          <ImageDropzone
            key={i}
            value={r}
            onChange={(next) => {
              if (next === null) {
                onChange(refs.filter((_, idx) => idx !== i));
              } else {
                const copy = [...refs];
                copy[i] = next;
                onChange(copy);
              }
            }}
          />
        ))}
        {refs.length < max && (
          <ImageDropzone
            value={null}
            onChange={(next) => {
              if (next) onChange([...refs, next]);
            }}
          />
        )}
      </div>
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button className="w-full" variant="outline" onClick={onClick}>
      <Plus className="h-4 w-4" />
      {t("Add to queue")}
    </Button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

// ---- Draft list -----------------------------------------------------------

function DraftList({
  drafts,
  onRemove,
  onDuplicate,
  onSubmit,
}: {
  drafts: Draft[];
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="flex items-center justify-between p-5 pb-3">
        <CardTitle className="text-base">
          {t("Drafts")}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {drafts.length}
          </span>
        </CardTitle>
        <Button size="sm" onClick={onSubmit} disabled={drafts.length === 0}>
          <Send className="h-4 w-4" />
          {t("Submit ({count})", { count: drafts.length })}
        </Button>
      </div>
      <CardContent className="pt-0">
        {drafts.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t("No drafts yet. Compose a request, then click \"Add to queue\".")}
          </p>
        ) : (
          <div className="space-y-2">
            {drafts.map((d) => (
              <div
                key={d.localId}
                className="flex items-start gap-3 rounded-md border border-border bg-background/40 p-3"
              >
                <Badge tone={d.type === "video" ? "info" : "neutral"}>
                  {t(d.type)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs">{d.prompt}</p>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">
                    {shorten(d.modelLabel)} · {d.aspectRatio}
                    {d.type === "image"
                      ? ` · x${d.quantity}`
                      : ` · ${resolutionLabel(d.resolution)} · ${d.duration}s${d.audio ? ` · ${t("audio")}` : ""}`}
                    {d.refs.length > 0 ? ` · ${d.refs.length} ${t("ref")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDuplicate(d.localId)}
                    aria-label={t("Duplicate draft")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(d.localId)}
                    aria-label={t("Remove draft")}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-300" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Queue list (live) ----------------------------------------------------

function QueueList({
  jobs,
  onPreview,
  onChanged,
}: {
  jobs: QueueJob[];
  onPreview: (url: string) => void;
  onChanged: () => void;
}) {
  const { showError } = useToast();
  const { t } = useTranslation();
  const counts = useMemo(() => {
    const c = { pending: 0, running: 0, completed: 0, failed: 0, canceled: 0 };
    for (const j of jobs) c[j.status]++;
    return c;
  }, [jobs]);

  const hasFinished = counts.completed + counts.failed + counts.canceled > 0;

  const onClear = async () => {
    try {
      await api.clearFinishedQueueJobs();
      onChanged();
    } catch (err) {
      showError((err as Error).message);
    }
  };

  return (
    <Card className="flex min-h-0 flex-col lg:max-h-full">
      <div className="flex items-center justify-between border-b border-border/60 p-5 pb-3">
        <div>
          <CardTitle className="text-base">{t("Queue")}</CardTitle>
          <CardDescription>
            {jobs.length === 0
              ? t("Submitted jobs appear here.")
              : t("{running} running · {pending} pending · {completed} done · {failed} failed", counts)}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={!hasFinished}
        >
          <Eraser className="h-4 w-4" />
          {t("Clear finished")}
        </Button>
      </div>
      <CardContent className="flex-1 overflow-y-auto p-5 pt-4">
        {jobs.length === 0 ? (
          <EmptyQueue />
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => (
              <JobRow key={j.id} job={j} onPreview={onPreview} onChanged={onChanged} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobRow({
  job,
  onPreview,
  onChanged,
}: {
  job: QueueJob;
  onPreview: (url: string) => void;
  onChanged: () => void;
}) {
  const { showError } = useToast();
  const { t } = useTranslation();
  const thumb = job.thumbUrls[0] ?? (job.type === "image" ? job.resultUrls[0] : undefined);

  const act = async (fn: () => Promise<void>) => {
    try {
      await fn();
      onChanged();
    } catch (err) {
      showError((err as Error).message);
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-accent">
        {thumb ? (
          <button
            type="button"
            onClick={() => onPreview(job.resultUrls[0] ?? thumb)}
            aria-label={t("Preview result")}
          >
            <img src={thumb} alt="" className="h-16 w-16 object-cover" />
          </button>
        ) : (
          <StatusIcon status={job.status} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={job.type === "video" ? "info" : "neutral"}>{t(job.type)}</Badge>
          <StatusBadge status={job.status} />
        </div>
        <p className="mt-1 line-clamp-2 text-xs">{job.prompt}</p>
        {job.error ? (
          <p className="mt-1 line-clamp-2 text-[11px] text-red-300">{job.error}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {job.status === "pending" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => act(() => api.cancelQueueJob(job.id))}
            aria-label={t("Cancel job")}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        )}
        {(job.status === "failed" || job.status === "canceled") && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => act(() => api.retryQueueJob(job.id))}
            aria-label={t("Retry job")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: QueueJob["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-red-400" />;
    case "canceled":
      return <Ban className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Play className="h-5 w-5 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: QueueJob["status"] }) {
  const { t } = useTranslation();
  switch (status) {
    case "running":
      return <Badge tone="info">{t("running")}</Badge>;
    case "completed":
      return <Badge tone="success">{t("completed")}</Badge>;
    case "failed":
      return <Badge tone="danger">{t("failed")}</Badge>;
    case "canceled":
      return <Badge tone="warning">{t("canceled")}</Badge>;
    default:
      return <Badge tone="neutral">{t("pending")}</Badge>;
  }
}

function EmptyQueue() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <ListChecks className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">{t("Queue is empty")}</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {t("Compose requests on the left, then submit them to run in the background.")}
      </p>
    </div>
  );
}

function shorten(s: string, max = 22): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}
