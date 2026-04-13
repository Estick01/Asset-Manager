import seoPages from "@shared/seo/public-seo-pages.json";

export type PublicSeoPageContent = {
  route: string;
  output: string;
  title: string;
  description: string;
  canonicalPath: string;
  breadcrumbLabel: string;
  eyebrow: string;
  heroTitle: string;
  heroBody: string;
  bullets: string[];
  sections: {
    title: string;
    body: string;
  }[];
};

const pages = seoPages.pages as PublicSeoPageContent[];

export function getPublicSeoPage(route: string) {
  return pages.find((page) => page.route === route);
}

export function getAllPublicSeoPages() {
  return pages;
}
