/**
 * Remembers the last full path (including query string) visited under each
 * bottom-nav tab, so switching tabs and back restores search/filter state
 * instead of resetting to the tab's bare root. Lives outside React state
 * because MobileBottomNav remounts on every navigation (PageLayout is
 * recreated per page) — a plain module-level map survives that.
 */
const TAB_PATHS = ['/home', '/search', '/vocabulary', '/import', '/review'] as const
export type TabPath = (typeof TAB_PATHS)[number]

const lastPathByTab = new Map<TabPath, string>(TAB_PATHS.map((tab) => [tab, tab]))

function matchTab(pathname: string): TabPath | undefined {
  return TAB_PATHS.find((tab) => pathname === tab || pathname.startsWith(`${tab}/`))
}

export function recordTabLocation(pathname: string, search: string): void {
  const tab = matchTab(pathname)
  if (tab) lastPathByTab.set(tab, `${pathname}${search}`)
}

export function getTabHref(tab: TabPath): string {
  return lastPathByTab.get(tab) ?? tab
}
