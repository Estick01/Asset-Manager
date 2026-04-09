export type ViewportTier = "mobile" | "tablet" | "desktop" | "wide" | "ultrawide";

export interface DesktopMetrics {
  tier: ViewportTier;
  gutter: number;
  contentGap: number;
  sidebarWidth: number;
  topbarHeight: number;
}

export function getViewportTier(width: number): ViewportTier {
  if (width >= 1920) return "ultrawide";
  if (width >= 1440) return "wide";
  if (width >= 1024) return "desktop";
  if (width >= 768) return "tablet";
  return "mobile";
}

export function getDesktopMetrics(width: number): DesktopMetrics {
  const tier = getViewportTier(width);

  switch (tier) {
    case "ultrawide":
      return { tier, gutter: 24, contentGap: 24, sidebarWidth: 288, topbarHeight: 82 };
    case "wide":
      return { tier, gutter: 28, contentGap: 22, sidebarWidth: 276, topbarHeight: 78 };
    case "desktop":
      return { tier, gutter: 24, contentGap: 20, sidebarWidth: 264, topbarHeight: 74 };
    case "tablet":
      return { tier, gutter: 20, contentGap: 16, sidebarWidth: 248, topbarHeight: 72 };
    default:
      return { tier, gutter: 16, contentGap: 14, sidebarWidth: 0, topbarHeight: 64 };
  }
}

export function isDesktopViewport(width: number) {
  return width >= 1024;
}
