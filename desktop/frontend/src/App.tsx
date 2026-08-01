import { useEffect, useMemo, useState } from "react";
import { Sidebar, type NavId } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { AboutDialog } from "@/components/about-dialog";
import { BalancePill } from "@/components/balance-pill";
import { GenerateImagePage } from "@/pages/generate-image";
import { GenerateVideoPage } from "@/pages/generate-video";
import { QueuePage } from "@/pages/queue";
import { LibraryPage } from "@/pages/library";
import { CookiesPage } from "@/pages/cookies";
import { ModelsPage } from "@/pages/models";
import { SettingsPage } from "@/pages/settings";

// Pages that should show the balance pill in the topbar — only the ones
// that consume credits.
const BALANCE_PAGES = new Set<NavId>(["image", "video", "queue"]);

import { useTranslation } from "@/lib/i18n";

const PAGE_META: Record<NavId, { title: string; render: (ctx: PageContext) => JSX.Element }> = {
  image: {
    title: "Generate Image",
    render: () => <GenerateImagePage />,
  },
  video: {
    title: "Generate Video",
    render: () => <GenerateVideoPage />,
  },
  queue: {
    title: "Queue",
    render: () => <QueuePage />,
  },
  library: {
    title: "Library",
    render: (ctx) => <LibraryPage onNavigate={ctx.navigate} />,
  },
  cookies: {
    title: "Cookies",
    render: () => <CookiesPage />,
  },
  models: {
    title: "Models",
    render: () => <ModelsPage />,
  },
  settings: {
    title: "Settings",
    render: () => <SettingsPage />,
  },
};

type PageContext = {
  navigate: (id: NavId) => void;
};

const STORAGE_NAV = "leostudio-nav";
const STORAGE_COLLAPSED = "leostudio-collapsed";

export default function App() {
  const [page, setPage] = useState<NavId>(() => {
    const stored = localStorage.getItem(STORAGE_NAV) as NavId | null;
    return stored ?? "image";
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_COLLAPSED) === "1";
  });
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_NAV, page);
  }, [page]);
  useEffect(() => {
    localStorage.setItem(STORAGE_COLLAPSED, collapsed ? "1" : "0");
  }, [collapsed]);

  const { t } = useTranslation();
  const meta = useMemo(() => PAGE_META[page], [page]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        active={page}
        onChange={setPage}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        onAbout={() => setAboutOpen(true)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          title={t(meta.title)}
          rightSlot={BALANCE_PAGES.has(page) ? <BalancePill /> : undefined}
        />
        <main key={page} className="min-h-0 flex-1 animate-fade-in overflow-hidden bg-background">
          {meta.render({ navigate: setPage })}
        </main>
      </div>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
