import { useCallback, useEffect, useState } from "react";
import {
  HardDrive,
  Save,
  Loader2,
  Star,
  RectangleHorizontal,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import {
  api,
  type AspectRatioOption,
  type ImageModel,
} from "@/lib/api";

// Settings page wires SQLite-backed key/value entries to friendly UI controls.
// Each section saves independently so a partial edit never blocks others.
export function SettingsPage() {
  const { showSuccess, showError } = useToast();
  const { locale, setLocale, t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [aspect, setAspect] = useState("1:1");
  const [aspectOptions, setAspectOptions] = useState<AspectRatioOption[]>([]);
  const [autoSave, setAutoSave] = useState(false);
  const [saveDir, setSaveDir] = useState("data/generated");
  const [models, setModels] = useState<ImageModel[]>([]);
  const [defaultModelId, setDefaultModelId] = useState<string>("");

  const [savingAspect, setSavingAspect] = useState(false);
  const [savingStorage, setSavingStorage] = useState(false);
  const [savingDefaultModel, setSavingDefaultModel] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [aspects, defAspect, autoSaveValue, dirValue, modelList] =
        await Promise.all([
          api.listImageAspects(),
          api.getSetting("default_aspect_ratio", "1:1"),
          api.getSetting("auto_save_images", "0"),
          api.getSetting("save_images_dir", "data/generated"),
          api.listImageModels(),
        ]);
      setAspectOptions(aspects);
      setAspect(defAspect || "1:1");
      setAutoSave(autoSaveValue === "1");
      setSaveDir(dirValue || "data/generated");
      setModels(modelList);
      const def = modelList.find((m) => m.isDefault);
      setDefaultModelId(def?.modelId ?? "");
    } catch (err) {
      showError(`${t("Load failed")}: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onSaveAspect = async () => {
    setSavingAspect(true);
    try {
      await api.setSetting("default_aspect_ratio", aspect);
      showSuccess(t("Saved {value}", { value: aspect }));
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSavingAspect(false);
    }
  };

  const onSaveStorage = async () => {
    setSavingStorage(true);
    try {
      await api.setSetting("auto_save_images", autoSave ? "1" : "0");
      await api.setSetting(
        "save_images_dir",
        saveDir.trim() || "data/generated"
      );
      showSuccess(t("Saved"));
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSavingStorage(false);
    }
  };

  const onSaveDefaultModel = async () => {
    if (!defaultModelId) return;
    const m = models.find((mm) => mm.modelId === defaultModelId);
    if (!m) return;
    setSavingDefaultModel(true);
    try {
      await api.setDefaultImageModel(m.id);
      showSuccess(`Default · ${m.name}`);
      await reload();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSavingDefaultModel(false);
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-6">
        <Section icon={RectangleHorizontal} title={t("Language")}>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)} className="max-w-xs">
              <option value="en">English</option>
              <option value="zh-CN">简体中文</option>
            </Select>
            <p className="text-xs text-muted-foreground">{t("Choose the display language for LeoStudio.")}</p>
          </div>
        </Section>

        <Section icon={RectangleHorizontal} title={t("Default aspect ratio")}>
          <div className="flex items-center gap-2">
            <Select
              value={aspect}
              onChange={(e) => setAspect(e.target.value)}
              className="max-w-xs"
            >
              {aspectOptions.map((a) => (
                <option key={a.label} value={a.label}>
                  {a.label}
                </option>
              ))}
            </Select>
            <Button onClick={onSaveAspect} disabled={savingAspect}>
              {savingAspect ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("Save")}
            </Button>
          </div>
        </Section>

        <Section icon={Star} title={t("Default image model")}>
          {models.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("Add or sync a model first.")}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Select
                value={defaultModelId}
                onChange={(e) => setDefaultModelId(e.target.value)}
                className="max-w-md"
              >
                {models.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <Button onClick={onSaveDefaultModel} disabled={savingDefaultModel}>
                {savingDefaultModel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("Save")}
              </Button>
            </div>
          )}
        </Section>

        <Section icon={HardDrive} title={t("Auto-save")}>
          <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
            <span className="text-sm">{t("Save outputs to disk")}</span>
            <Switch checked={autoSave} onCheckedChange={setAutoSave} />
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={saveDir}
              onChange={(e) => setSaveDir(e.target.value)}
              placeholder="data/generated"
              disabled={!autoSave}
            />
            <Button
              variant="outline"
              size="icon"
              type="button"
              disabled={!autoSave}
              onClick={async () => {
                try {
                  const picked = await api.openDirectoryDialog(saveDir);
                  if (picked) setSaveDir(picked);
                } catch (err) {
                  showError((err as Error).message);
                }
              }}
              aria-label={t("Choose folder")}
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={async () => {
                try {
                  await api.openInFileManager(saveDir);
                } catch (err) {
                  showError((err as Error).message);
                }
              }}
              aria-label={t("Open folder")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={onSaveStorage} disabled={savingStorage}>
            {savingStorage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("Save")}
          </Button>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof HardDrive;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 p-5 pb-2">
        <Icon className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">{title}</CardTitle>
      </div>
      <CardContent className="space-y-3 pt-0">{children}</CardContent>
    </Card>
  );
}

function SettingsSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-6">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <div className="space-y-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-full max-w-xs" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
