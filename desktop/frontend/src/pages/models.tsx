import { useCallback, useEffect, useState } from "react";
import {
  Layers,
  Plus,
  Star,
  Trash2,
  Loader2,
  Video,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { api, type ImageModel, type VideoModel } from "@/lib/api";

export function ModelsPage() {
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();

  const [imageModels, setImageModels] = useState<ImageModel[] | null>(null);
  const [videoModels, setVideoModels] = useState<VideoModel[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");

  const reload = useCallback(async () => {
    try {
      const [img, vid] = await Promise.all([
        api.listImageModels(),
        api.listVideoModels(),
      ]);
      setImageModels(img);
      setVideoModels(vid);
    } catch (err) {
      showError(`${t("Load failed")}: ${(err as Error).message}`);
    }
  }, [showError, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onAddModel = async () => {
    if (!modelId.trim()) {
      showError(t("Model UUID required"));
      return;
    }
    setAdding(true);
    try {
      await api.addImageModel(name.trim(), modelId.trim());
      showSuccess(t("Model added"));
      setName("");
      setModelId("");
      await reload();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await api.syncImageModels();
      showSuccess(t("Synced · {total} models (+{added} new, {updated} updated)", {
        total: res.Total,
        added: res.Added,
        updated: res.Updated,
      }));
      await reload();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const onDelete = async (m: ImageModel) => {
    if (!confirm(t("Delete model {name}?", { name: m.name }))) return;
    try {
      await api.deleteImageModel(m.id);
      await reload();
    } catch (err) {
      showError((err as Error).message);
    }
  };

  const onSetDefault = async (m: ImageModel) => {
    try {
      await api.setDefaultImageModel(m.id);
      await reload();
    } catch (err) {
      showError((err as Error).message);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-6">
        <Card>
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">
                {t("Image")}
                {imageModels !== null ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {imageModels.length}
                  </span>
                ) : null}
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={syncing}
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              />
              {t("Sync")}
            </Button>
          </div>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Name")}
              />
              <Input
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder={t("Model UUID")}
                className="font-mono text-xs"
              />
              <Button onClick={onAddModel} disabled={adding || !modelId.trim()}>
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("Add")}
              </Button>
            </div>

            {imageModels === null ? (
              <ModelsSkeleton />
            ) : imageModels.length === 0 ? (
              <EmptyImageModels onSync={onSync} syncing={syncing} />
            ) : (
              <div className="space-y-2">
                {imageModels.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 px-4 py-3 transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{m.name}</span>
                        {m.isDefault && <Badge tone="success">{t("Default")}</Badge>}
                        {m.sdVersion && (
                          <Badge tone="info">{m.sdVersion}</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {m.modelId}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!m.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSetDefault(m)}
                        >
                          <Star className="h-3.5 w-3.5" />
                          {t("Default")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(m)}
                      >
                        <Trash2 className="h-4 w-4 text-red-300" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="flex items-center gap-2 p-5 pb-3">
            <Video className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">
              {t("Video")}
              {videoModels !== null ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {videoModels.length}
                </span>
              ) : null}
            </CardTitle>
          </div>
          <CardContent className="space-y-2 pt-0">
            {videoModels === null ? (
              <ModelsSkeleton />
            ) : (
              <div className="space-y-2">
                {videoModels.map((vm) => (
                  <div
                    key={vm.slug}
                    className="rounded-lg border border-border bg-background/40 px-4 py-3 transition hover:border-primary/30"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{vm.slug}</span>
                      <Badge tone="info">
                        {vm.defaultMode.replace("RESOLUTION_", "")}p
                      </Badge>
                      <Badge tone="neutral">{vm.defaultDuration}s</Badge>
                      {vm.supportsAudio && (
                        <Badge tone="success">{t("audio")}</Badge>
                      )}
                      {vm.supportsRefImage && (
                        <Badge tone="success">{t("ref image")}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ModelsSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyImageModels({
  onSync,
  syncing,
}: {
  onSync: () => void;
  syncing: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Layers className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">{t("No image models")}</p>
      <Button size="sm" onClick={onSync} disabled={syncing}>
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {t("Sync from Leonardo")}
      </Button>
    </div>
  );
}
