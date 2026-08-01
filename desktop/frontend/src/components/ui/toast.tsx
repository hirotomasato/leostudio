import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// Minimal toast system tailored for this app's feedback needs.
// Future-proof: the API surface (showSuccess/showError) matches what
// shadcn-ui/toast exposes so swapping later is non-breaking.
type ToastVariant = "success" | "error";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showSuccess: () => undefined,
  showError: () => undefined,
});

export function useToast() {
  return useContext(ToastContext);
}

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: ToastVariant) => {
    counter += 1;
    const id = counter;
    setItems((prev) => {
      // Keep only the 3 most recent so a runaway loop doesn't fill the screen.
      const next = [...prev, { id, message, variant }];
      return next.length > 3 ? next.slice(-3) : next;
    });
    // Auto dismiss after 4s; user can also click X to dismiss.
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const value: ToastContextValue = {
    showSuccess: (m) => push(m, "success"),
    showError: (m) => push(m, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={(id) =>
        setItems((prev) => prev.filter((t) => t.id !== id))
      } />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Trigger CSS transition on next tick.
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const Icon = item.variant === "success" ? CheckCircle2 : AlertTriangle;
  const tone =
    item.variant === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-red-500/40 bg-red-500/10 text-red-200";

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-md border p-3 text-sm shadow-lg backdrop-blur transition",
        tone,
        visible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 leading-snug">{item.message}</div>
      <button
        onClick={onDismiss}
        className="text-muted-foreground/60 hover:text-foreground"
        aria-label={t("dismiss")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
