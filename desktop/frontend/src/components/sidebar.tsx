import {
  ImageIcon,
  Video,
  Library,
  KeyRound,
  Layers,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  ListChecks,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// Each entry maps a nav id to the page rendered in App's switcher.
// IDs are stable so persistence and deep-links stay valid as the UI evolves.
export type NavId =
  | "image"
  | "video"
  | "queue"
  | "library"
  | "cookies"
  | "models"
  | "settings";

type NavItem = {
  id: NavId;
  label: string;
  icon: LucideIcon;
};

// Grouped navigation: workspace creates assets, manage configures the pool.
// Settings is intentionally placed in the footer so it never competes with
// daily-use entries.
const GROUPS: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "Workspace",
    items: [
      { id: "image", label: "Generate Image", icon: ImageIcon },
      { id: "video", label: "Generate Video", icon: Video },
      { id: "queue", label: "Queue", icon: ListChecks },
      { id: "library", label: "Library", icon: Library },
    ],
  },
  {
    heading: "Manage",
    items: [
      { id: "cookies", label: "Cookies", icon: KeyRound },
      { id: "models", label: "Models", icon: Layers },
    ],
  },
];

const SETTINGS_ITEM: NavItem = {
  id: "settings",
  label: "Settings",
  icon: Settings,
};

export function Sidebar({
  active,
  onChange,
  collapsed,
  onToggleCollapsed,
  onAbout,
}: {
  active: NavId;
  onChange: (id: NavId) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAbout: () => void;
}) {
  const { t } = useTranslation();
  const groups = GROUPS.map((group) => ({
    ...group,
    heading: t(group.heading),
    items: group.items.map((item) => ({ ...item, label: t(item.label) })),
  }));
  const settingsItem = { ...SETTINGS_ITEM, label: t(SETTINGS_ITEM.label) };
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-60"
      )}
    >
      <Brand collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />

      <div className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => (
          <NavGroup
            key={group.heading}
            heading={group.heading}
            items={group.items}
            active={active}
            onChange={onChange}
            collapsed={collapsed}
          />
        ))}
      </div>

      <div className="space-y-1 border-t border-sidebar-border p-2">
        <NavButton
          item={settingsItem}
          isActive={active === "settings"}
          onClick={() => onChange("settings")}
          collapsed={collapsed}
        />
        <button
          onClick={onAbout}
          title={collapsed ? t("About") : undefined}
          className={cn(
            "flex h-9 w-full items-center rounded-md text-xs text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          )}
        >
          <Info className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t("About")}</span>}
        </button>
      </div>
    </aside>
  );
}

function Brand({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex items-center border-b border-sidebar-border px-3 py-3",
        collapsed ? "justify-center" : "justify-between"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-4 w-4" strokeWidth={2.4} />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">
            LeoStudio
          </span>
        )}
      </div>
      {!collapsed && (
        <button
          onClick={onToggleCollapsed}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          aria-label={t("Collapse sidebar")}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      )}
      {collapsed && (
        <button
          onClick={onToggleCollapsed}
          className="absolute left-12 top-3 rounded-md bg-sidebar p-1.5 text-muted-foreground shadow ring-1 ring-sidebar-border hover:text-foreground"
          aria-label={t("Expand sidebar")}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function NavGroup({
  heading,
  items,
  active,
  onChange,
  collapsed,
}: {
  heading: string;
  items: NavItem[];
  active: NavId;
  onChange: (id: NavId) => void;
  collapsed: boolean;
}) {
  return (
    <div className="px-2 pb-3">
      {!collapsed && (
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {heading}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={item.id === active}
            onClick={() => onChange(item.id)}
            collapsed={collapsed}
          />
        ))}
      </div>
    </div>
  );
}

function NavButton({
  item,
  isActive,
  onClick,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex h-9 items-center rounded-md text-sm transition",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        isActive
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      />
      {!collapsed && <span className="font-medium">{item.label}</span>}
      {isActive && (
        <span
          className={cn(
            "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary",
            collapsed && "hidden"
          )}
        />
      )}
    </button>
  );
}
