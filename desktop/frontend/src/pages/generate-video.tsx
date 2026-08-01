import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Video,
  Sparkles,
  Loader2,
  Wand2,
  Volume2,
  VolumeX,
  Maximize2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Lightbox } from "@/components/ui/lightbox";
import { ImageDropzone, type DroppedImage } from "@/components/image-dropzone";
import { useToast } from "@/components/ui/toast";
import { api, type VideoGenerateResponse, type VideoModel } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { consumeReplay, onReplay } from "@/lib/replay";

// Aspect options that Seedance supports across all resolutions.
const ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];

function resolutionLabel(mode: string) {
  if (mode === "RESOLUTION_480") return "480p · SD";
  if (mode === "RESOLUTION_720") return "720p · HD";
  if (mode === "RESOLUTION_1080") return "1080p · FHD";
  return mode;
}

export function GenerateVideoPage() {
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();

  const [models, setModels] = useState<VideoModel[] | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [resolution, setResolution] = useState("RESOLUTION_480");
  const [duration, setDuration] = useState(8);
  const [audio, setAudio] = useState(false);
  const [startFrame, setStartFrame] = useState<DroppedImage | null>(null);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<VideoGenerateResponse | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    try {
      const list = await api.listVideoModels();
      setModels(list);
      if (list.length > 0) {
        setSlug(list[0].slug);
        setResolution(list[0].defaultMode);
        setAspect(list[0].defaultAspect);
        setDuration(list[0].defaultDuration);
      }
    } catch (err) {
      showError(`${t("Load failed")}: ${(err as Error).message}`);
    }
  }, [showError]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  // Consume replay payload from Library when navigating in.
  useEffect(() => {
    const apply = () => {
      const payload = consumeReplay("video");
      if (!payload) return;
      setPrompt(payload.prompt);
      if (payload.aspectRatio) setAspect(payload.aspectRatio);
    };
    apply();
    return onReplay(apply);
  }, []);

  const selectedModel = useMemo(
    () => models?.find((m) => m.slug === slug) ?? null,
    [models, slug]
  );

  // When model changes, snap resolution + duration into ranges.
  useEffect(() => {
    if (!selectedModel) return;
    if (!selectedModel.supportedModes.includes(resolution)) {
      setResolution(selectedModel.defaultMode);
    }
    if (!selectedModel.durationOptions.includes(duration)) {
      setDuration(selectedModel.defaultDuration);
    }
    if (!selectedModel.supportsAudio && audio) setAudio(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel?.slug]);

  const onGenerate = async () => {
    const p = prompt.trim();
    if (!p) {
      showError(t("Prompt cannot be empty."));
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const res = await api.generateVideo({
        prompt: p,
        modelSlug: slug,
        aspectRatio: aspect,
        resolution,
        duration,
        audio,
        imageURL:
          startFrame?.source === "url" ? startFrame.url : undefined,
        imageId:
          startFrame?.source === "uploaded" ? startFrame.imageId : undefined,
      });
      setResult(res);

      if (res.provider.save_error) {
        showError(`${t("Auto-save failed")}: ${res.provider.save_error}`);
      } else if (
        res.provider.auto_save_enabled &&
        res.provider.saved_files.length > 0
      ) {
        showSuccess(
          t("Saved {value}", { value: res.provider.saved_files[0] })
        );
      } else {
        showSuccess(`${t("Video complete")} · ${duration}s · ${aspect}`);
      }
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  if (models === null) {
    return <GenerateVideoSkeleton />;
  }

  if (models.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-10 text-center">
            <p className="text-sm font-medium">{t("No video model registered")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Catalog kosong — tambahkan model di internal/service/video_models.go
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const minDuration = Math.min(...(selectedModel?.durationOptions ?? [4]));
  const maxDuration = Math.max(...(selectedModel?.durationOptions ?? [15]));

  return (
    <div className="grid h-full grid-cols-1 gap-6 overflow-hidden p-6 lg:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="self-start lg:max-h-full lg:overflow-y-auto">
        <div className="flex items-center gap-2 p-5 pb-3">
          <Wand2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{t("Compose")}</CardTitle>
        </div>
        <CardContent className="space-y-4 pt-0">
          <Field label={t("Prompt")}>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (!generating && prompt.trim() && slug) void onGenerate();
                }
              }}
              placeholder="Cinematic footage of..."
              className="min-h-[120px]"
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
                {ASPECTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={t("Resolution")}>
            <Select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            >
              {selectedModel?.supportedModes.map((m) => (
                <option key={m} value={m}>
                  {resolutionLabel(m)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={`${t("Duration")} · ${duration}s`}>
            <Slider
              value={duration}
              onValueChange={(v) => {
                // Snap to nearest allowed value.
                const opts = selectedModel?.durationOptions ?? [];
                const next = opts.reduce(
                  (best, val) => (Math.abs(val - v) < Math.abs(best - v) ? val : best),
                  opts[0] ?? v
                );
                setDuration(next);
              }}
              min={minDuration}
              max={maxDuration}
              step={1}
            />
          </Field>

          {selectedModel?.supportsAudio && (
            <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                {audio ? (
                  <Volume2 className="h-4 w-4 text-primary" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{t("Native audio")}</span>
              </div>
              <Switch checked={audio} onCheckedChange={setAudio} />
            </div>
          )}

          {selectedModel?.supportsRefImage && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t("Start frame")} <span className="text-[10px]">({t("optional")})</span>
              </p>
              <ImageDropzone
                value={startFrame}
                onChange={setStartFrame}
              />
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={onGenerate}
            disabled={generating || !prompt.trim() || !slug}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Generating...")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("Generate")}
                <span className="ml-1 hidden text-[10px] opacity-60 sm:inline">
                  Ctrl+Enter
                </span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <VideoResultArea
        generating={generating}
        result={result}
        duration={duration}
        aspect={aspect}
        audio={audio}
        onPreview={(url) => setPreview(url)}
      />
      <Lightbox url={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function VideoResultArea({
  generating,
  result,
  duration,
  aspect,
  audio,
  onPreview,
}: {
  generating: boolean;
  result: VideoGenerateResponse | null;
  duration: number;
  aspect: string;
  audio: boolean;
  onPreview: (url: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="flex min-h-[420px] flex-col lg:max-h-full">
      <div className="flex items-center justify-between border-b border-border/60 p-5 pb-3">
        <div>
          <CardTitle className="text-base">{t("Result")}</CardTitle>
          <CardDescription>
            {result
              ? `${result.data.length} video · cookie #${result.provider.used_cookie_id}`
              : t("Generated video appears here.")}
          </CardDescription>
        </div>
        {result?.provider.generation_id ? (
          <Badge tone="info">{result.provider.generation_id.slice(0, 8)}</Badge>
        ) : null}
      </div>
      <CardContent className="flex-1 overflow-y-auto p-5 pt-4">
        {generating ? (
          <VideoSkeleton duration={duration} aspect={aspect} />
        ) : result ? (
          <div className="flex flex-col items-center gap-4">
            {result.data.map((item, i) => (
              <VideoPlayer
                key={i}
                url={item.mp4_url}
                thumb={item.thumbnail_url}
                aspect={aspect}
                audio={audio}
                onPreview={() => onPreview(item.mp4_url)}
              />
            ))}
          </div>
        ) : (
          <EmptyVideo />
        )}
      </CardContent>
    </Card>
  );
}

// Map aspect ratio string to Tailwind aspect-* class so loading skeletons
// and finished videos share the exact same dimensions.
function videoAspectClass(aspect: string): string {
  switch (aspect) {
    case "9:16":
      return "aspect-[9/16]";
    case "1:1":
      return "aspect-square";
    case "4:3":
      return "aspect-[4/3]";
    case "3:4":
      return "aspect-[3/4]";
    case "21:9":
      return "aspect-[21/9]";
    case "9:21":
      return "aspect-[9/21]";
    default:
      return "aspect-video"; // 16:9
  }
}

// A single, fixed container width used by BOTH the skeleton and the finished
// player so the panel never jumps or widens when the result arrives. Portrait
// clips get a narrower box so they don't tower over the panel; everything else
// shares one compact, Library-style size.
function videoBoxWidth(aspect: string): string {
  const portrait = aspect === "9:16" || aspect === "3:4" || aspect === "9:21";
  return portrait ? "max-w-[220px]" : "max-w-sm";
}

function VideoPlayer({
  url,
  thumb,
  aspect,
  audio,
  onPreview,
}: {
  url: string;
  thumb?: string;
  aspect: string;
  audio: boolean;
  onPreview: () => void;
}) {
  const { t } = useTranslation();
  const ratio = videoAspectClass(aspect);
  const boxWidth = videoBoxWidth(aspect);

  return (
    <div className={`w-full ${boxWidth} overflow-hidden rounded-lg border border-border bg-background/40`}>
      <div className={`relative w-full bg-black ${ratio}`}>
        <video
          controls
          autoPlay
          playsInline
          // Mute by default so autoplay isn't blocked by the browser policy.
          // The user can unmute via the native control if Audio toggle was on.
          muted={!audio}
          src={url}
          poster={thumb}
          className="absolute inset-0 h-full w-full object-contain"
          preload="metadata"
        />
        <button
          type="button"
          onClick={onPreview}
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[11px] backdrop-blur transition hover:bg-background"
          aria-label={t("Open fullscreen preview")}
        >
          <Maximize2 className="h-3 w-3" />
          {t("Preview")}
        </button>
      </div>
      <div className="flex items-center justify-end px-3 py-2">
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <Maximize2 className="h-3 w-3" />
          {t("Open")}
        </button>
      </div>
    </div>
  );
}

function VideoSkeleton({ duration, aspect }: { duration: number; aspect: string }) {
  const { t } = useTranslation();
  const ratio = videoAspectClass(aspect);
  const boxWidth = videoBoxWidth(aspect);
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Same width + aspect as the finished player so nothing shifts. */}
      <div className={`w-full ${boxWidth} overflow-hidden rounded-lg border border-border bg-background/40`}>
        <div className={`relative w-full ${ratio}`}>
          <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">
              {t("Rendering {duration}s clip", { duration })}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end px-3 py-2">
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

function EmptyVideo() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Video className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">{t("Ready to generate")}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
      {hint ? <p className="text-[10px] text-muted-foreground/70">{hint}</p> : null}
    </div>
  );
}

function GenerateVideoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[420px_minmax(0,1fr)]">
      <Card>
        <div className="space-y-4 p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
      <Card>
        <div className="p-5">
          <Skeleton className="h-72 w-full" />
        </div>
      </Card>
    </div>
  );
}
