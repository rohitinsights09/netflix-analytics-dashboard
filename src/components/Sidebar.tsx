import {
  BarChart3,
  Database,
  FileArchive,
  Film,
  Globe2,
  Info,
  LayoutDashboard,
  Lightbulb,
  Tv,
  X,
} from 'lucide-react';
import type { PageId } from '../types/netflix';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onDownloadZip: () => void;
  downloadingZip: boolean;
}

const NAV_ITEMS: Array<{ id: PageId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'content', label: 'Content Analytics', icon: BarChart3 },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'tvshows', label: 'TV Shows', icon: Tv },
  { id: 'countries-genres', label: 'Countries & Genres', icon: Globe2 },
  { id: 'insights', label: 'Business Insights', icon: Lightbulb },
  { id: 'explorer', label: 'Data Explorer', icon: Database },
  { id: 'about', label: 'About Project', icon: Info },
];

export function Sidebar({
  activePage,
  onSelectPage,
  mobileOpen,
  onCloseMobile,
  onDownloadZip,
  downloadingZip,
}: SidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-white/10">
      {/* Brand Block */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Original geometric streaming bars mark (not the official Netflix logo) */}
          <div className="w-9 h-9 rounded-md bg-[#E50914] flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-white"
              fill="none"
              aria-hidden="true"
            >
              <rect x="4" y="12" width="3.5" height="8" rx="0.75" fill="currentColor" />
              <rect x="10.25" y="7" width="3.5" height="13" rx="0.75" fill="currentColor" />
              <rect x="16.5" y="4" width="3.5" height="16" rx="0.75" fill="currentColor" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-display text-xl font-bold tracking-wide text-white leading-none">
              NETFLIX INSIGHTS
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 truncate">
              Content Analytics &amp; BI
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-neutral-400 hover:text-white rounded-md cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectPage(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer ${
                active
                  ? 'bg-[#E50914]/15 text-white border border-[#E50914]/40'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? 'text-[#E50914]' : 'text-neutral-500'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Portfolio Creator & Export */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <button
          type="button"
          onClick={onDownloadZip}
          disabled={downloadingZip}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-[#1a1a1a] hover:bg-[#242424] text-neutral-200 border border-white/10 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
        >
          <FileArchive className="w-3.5 h-3.5 text-[#E50914]" />
          {downloadingZip ? 'Packaging Project ZIP...' : 'Export Project ZIP'}
        </button>

        <div className="pt-1 text-xs text-neutral-400">
          <div className="text-neutral-500 uppercase tracking-wider text-[10px]">
            Portfolio Author
          </div>
          <div className="text-white font-semibold mt-0.5">Rohit Shinde</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            Data Analyst · BI Developer
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative w-64 max-w-[82vw] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
