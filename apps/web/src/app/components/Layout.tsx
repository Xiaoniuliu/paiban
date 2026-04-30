import { ChevronDown, LogOut, Menu, Plane } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { allowedMenuForRole, parentForView } from '../menu';
import type { MenuGroupId } from '../menu';
import { menuTitleKey, viewTitleKey } from '../i18n';
import type { DisplayTimezone, Language, UserProfile, ViewId } from '../types';
import { Button } from './ui/button';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewId;
  setActiveView: (view: ViewId) => void;
  user: UserProfile;
  language: Language;
  setLanguage: (language: Language) => void;
  timezone: DisplayTimezone;
  setTimezone: (timezone: DisplayTimezone) => void;
  t: (key: string) => string;
  onLogout: () => void;
}

export default function Layout({
  children,
  activeView,
  setActiveView,
  user,
  language,
  setLanguage,
  timezone,
  setTimezone,
  t,
  onLogout,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const menu = useMemo(() => allowedMenuForRole(user.role), [user.role]);
  const [expandedGroups, setExpandedGroups] = useState<MenuGroupId[]>(() => {
    const activeParent = parentForView(activeView);
    return activeParent ? [activeParent.id] : [];
  });

  useEffect(() => {
    const availableGroupIds = new Set(menu.map((item) => item.id));
    setExpandedGroups((current) => current.filter((groupId) => availableGroupIds.has(groupId)));
  }, [menu]);

  useEffect(() => {
    const activeParent = parentForView(activeView);
    if (!activeParent) return;

    setExpandedGroups((current) =>
      current.includes(activeParent.id) ? current : [...current, activeParent.id],
    );
  }, [activeView]);

  const toggleGroup = (groupId: MenuGroupId) => {
    setExpandedGroups((current) =>
      current.includes(groupId) ? current.filter((item) => item !== groupId) : [...current, groupId],
    );
  };

  const closeSidebarForSmallScreen = () => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t('closeMenu')}
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:relative md:z-auto ${
          sidebarOpen ? 'translate-x-0 md:translate-x-0' : '-translate-x-full md:w-0 md:translate-x-0'
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
          <Plane className="h-8 w-8 text-primary" />
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{t('appName')}</div>
            <div className="truncate text-xs text-muted-foreground">{t('appSubtitle')}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {menu.map((group) => {
              const Icon = group.icon;
              const expanded = expandedGroups.includes(group.id);
              const isDirectEntry = Boolean(group.viewId);
              const groupActive =
                group.viewId === activeView ||
                group.aliases?.includes(activeView) ||
                group.children.some((child) => child.id === activeView);
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (group.viewId) {
                        setActiveView(group.viewId);
                        closeSidebarForSmallScreen();
                        return;
                      }
                      toggleGroup(group.id);
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                      groupActive
                        ? 'bg-sidebar-accent text-sidebar-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{t(menuTitleKey[group.id])}</span>
                    {!isDirectEntry && (
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>
                  {!isDirectEntry && expanded && (
                    <div className="mt-1 space-y-1 pl-7">
                      {group.children.map((child) => {
                        const selected = activeView === child.id;
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => {
                              setActiveView(child.id);
                              closeSidebarForSmallScreen();
                            }}
                            className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors ${
                              selected
                                ? 'bg-primary text-primary-foreground'
                                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            }`}
                          >
                            <span className="truncate">{t(viewTitleKey[child.id])}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={t('openMenu')}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">{t(viewTitleKey[activeView])}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              aria-label={t('language')}
            >
              <option value="zh-CN">中文</option>
              <option value="en-US">English</option>
            </select>
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value as DisplayTimezone)}
              aria-label={t('timezone')}
            >
              <option value="UTC+8">UTC+8</option>
              <option value="UTC">UTC</option>
            </select>
            <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm md:flex">
              <span className="font-medium">{user.displayName}</span>
              <span className="text-muted-foreground">{user.role}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              {t('signOut')}
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto p-5">{children}</main>
      </div>
    </div>
  );
}
