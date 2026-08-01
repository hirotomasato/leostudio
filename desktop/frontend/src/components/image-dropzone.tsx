import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";

// One reference / start frame slot. Holds either a pre-uploaded init image id
// (drag-drop / file picker) or a remote URL the backend will fetch on
// generate. The component manages its own preview thumbnail data URL.
export type DroppedImage = {
  source: "uploaded" | "url";
  imageId?: string; // when source === "uploaded"
  url?: string; // when source === "url"
  previewURL: string; // local data URL or remote URL for thumbnail rendering
  filename?: string;
};

const ACCEPTED_EXTS = ["jpg", "jpeg", "png", "webp"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function extractExt(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "jpg";
  return name.slice(dot + 1).toLowerCase();
}

export function ImageDropzone({
  value,
  onChange,
  hint,
}: {
  value: DroppedImage | null;
  onChange: (next: DroppedImage | null) => void;
  hint?: string;
}) {
  const { showError } = useToast();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const onPickFile = () => inputRef.current?.click();

  const onUploadFile = useCallback(
    async (file: File) => {
      const ext = extractExt(file.name);
      if (!ACCEPTED_EXTS.includes(ext)) {
        showError(t("File must be jpg/png/webp (got {ext}).", { ext }));
        return;
      }
      console.log("[dropzone] uploading:", {
        name: file.name,
        size: file.size,
        type: file.type,
        ext,
      });
      setUploading(true);
      try {
        const dataURL = await fileToBase64(file);
        console.log("[dropzone] base64 ready, length=", dataURL.length);
        const id = await api.uploadLocalImage(dataURL, ext);
        console.log("[dropzone] upload success id=", id);
        onChange({
          source: "uploaded",
          imageId: id,
          previewURL: dataURL,
          filename: file.name,
        });
      } catch (err) {
        console.error("[dropzone] upload failed", err);
        showError(`${t("Upload failed")}: ${(err as Error).message}`);
      } finally {
        setUploading(false);
      }
    },
    [onChange, showError, t]
  );

  const onSubmitURL = () => {
    const u = urlInput.trim();
    if (!u) {
      showError(t("URL cannot be empty."));
      return;
    }
    onChange({ source: "url", url: u, previewURL: u });
    setUrlInput("");
    setShowUrlField(false);
  };

  // ---- Render ------------------------------------------------------------

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-card p-2">
        <img
          src={value.previewURL}
          alt={t("Reference image")}
          className="h-16 w-16 rounded object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {value.filename ?? value.url ?? t("Reference image")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {value.source === "uploaded"
              ? `${t("Uploaded")} · id ${value.imageId?.slice(0, 8)}…`
              : t("Remote URL")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          aria-label={t("Remove reference")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (showUrlField) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmitURL();
              }
            }}
          />
          <Button size="sm" onClick={onSubmitURL} disabled={!urlInput.trim()}>
            {t("Use")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowUrlField(false);
              setUrlInput("");
            }}
          >
            {t("Cancel")}
          </Button>
        </div>
        {hint ? (
          <p className="text-[10px] text-muted-foreground/80">{hint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void onUploadFile(file);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card/30 p-4 text-center transition",
        dragOver && "border-primary bg-primary/5",
        uploading && "opacity-70"
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </div>
      <p className="text-xs font-medium">
        {uploading ? t("Uploading…") : t("Drag image here")}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {t("jpg / png / webp, max 1 file")}
      </p>
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onPickFile}
          disabled={uploading}
        >
          <Upload className="h-3.5 w-3.5" />
          {t("Choose file")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowUrlField(true)}
          disabled={uploading}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          {t("Paste URL")}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onUploadFile(file);
          e.target.value = "";
        }}
      />
      {hint ? (
        <p className="mt-1 text-[10px] text-muted-foreground/80">{hint}</p>
      ) : null}
    </div>
  );
}
