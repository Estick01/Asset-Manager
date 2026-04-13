const fs = require("fs");
const path = require("path");
const seoPages = require("../shared/seo/public-seo-pages.json");

const distDir = path.resolve(__dirname, "..", "dist");
const assetsDir = path.join(distDir, "assets");
const outputFontsDir = path.join(assetsDir, "fonts");
const projectRoot = path.resolve(__dirname, "..");
const appJsonPath = path.join(projectRoot, "app.json");
const appJson = fs.existsSync(appJsonPath)
  ? JSON.parse(fs.readFileSync(appJsonPath, "utf8"))
  : {};
const expoConfig = appJson.expo ?? {};
const appName = expoConfig.name ?? "ProcesoClaro";
const baseUrl = resolveBaseUrl();
const seoPageMap = new Map((seoPages.pages ?? []).map((page) => [page.output, page]));
const legacyRedirects = [
  {
    output: "landing.html",
    fromPath: "/landing",
    toPath: "/",
  },
];

function resolveBaseUrl() {
  const configured =
    process.env.APP_URL ||
    process.env.EXPO_PUBLIC_APP_URL ||
    process.env.EXPO_PUBLIC_DOMAIN;

  if (!configured) {
    return "https://procesoclaro.co";
  }

  if (/^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, "");
  }

  return `https://${configured.replace(/\/+$/, "")}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function removeSeoTags(html) {
  const patterns = [
    /<meta name="description"[^>]*>\s*/gi,
    /<meta name="robots"[^>]*>\s*/gi,
    /<meta property="og:type"[^>]*>\s*/gi,
    /<meta property="og:locale"[^>]*>\s*/gi,
    /<meta property="og:site_name"[^>]*>\s*/gi,
    /<meta property="og:title"[^>]*>\s*/gi,
    /<meta property="og:description"[^>]*>\s*/gi,
    /<meta property="og:url"[^>]*>\s*/gi,
    /<meta property="og:image"[^>]*>\s*/gi,
    /<meta name="twitter:card"[^>]*>\s*/gi,
    /<meta name="twitter:title"[^>]*>\s*/gi,
    /<meta name="twitter:description"[^>]*>\s*/gi,
    /<meta name="twitter:image"[^>]*>\s*/gi,
    /<meta name="theme-color"[^>]*>\s*/gi,
    /<link rel="canonical"[^>]*>\s*/gi,
    /<link rel="manifest"[^>]*>\s*/gi,
    /<script id="seo-structured-data" type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi,
    /<style id="seo-prerender-style">[\s\S]*?<\/style>\s*/gi,
    /<script id="seo-prerender-script">[\s\S]*?<\/script>\s*/gi,
  ];

  return patterns.reduce((acc, pattern) => acc.replace(pattern, ""), html);
}

const sourceRoots = [
  path.join(assetsDir, "node_modules", "@expo-google-fonts", "inter"),
  path.join(
    assetsDir,
    "node_modules",
    "@expo",
    "vector-icons",
    "build",
    "vendor",
    "react-native-vector-icons",
    "Fonts",
  ),
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function collectFiles(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, predicate, results);
      continue;
    }
    if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function copyFontsAndBuildMap() {
  ensureDir(outputFontsDir);
  const replacements = new Map();

  for (const sourceRoot of sourceRoots) {
    const fontFiles = collectFiles(
      sourceRoot,
      (file) => /\.(ttf|otf|woff|woff2)$/i.test(file),
    );

    for (const sourceFile of fontFiles) {
      const fileName = path.basename(sourceFile);
      const targetFile = path.join(outputFontsDir, fileName);
      fs.copyFileSync(sourceFile, targetFile);

      const publicSourcePath = `/${toPosix(path.relative(distDir, sourceFile))}`;
      const publicTargetPath = `/${toPosix(path.relative(distDir, targetFile))}`;
      replacements.set(publicSourcePath, publicTargetPath);
    }
  }

  return replacements;
}

function rewriteReferences(replacements) {
  const textFiles = collectFiles(
    distDir,
    (file) => /\.(html|js|css|json|map)$/i.test(file),
  );

  for (const file of textFiles) {
    let content = fs.readFileSync(file, "utf8");
    let changed = false;

    for (const [from, to] of replacements.entries()) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
    }
  }
}

function buildSeoPayload(page) {
  const canonicalPath = page?.canonicalPath ?? "/";
  const title = page?.title ?? "Software para abogados en Colombia | ProcesoClaro";
  const description =
    page?.description ??
    "Gestiona procesos judiciales, clientes y casos en un solo lugar. Software juridico moderno para abogados y bufetes en Colombia.";
  const canonical = `${baseUrl}${canonicalPath}`;
  const ogImage = `${baseUrl}/assets/images/favicon.png`;
  const ogTitle = title;
  const ogDescription = description;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: appName,
      url: baseUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: canonical,
      inLanguage: "es-CO",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: appName,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      description,
      url: canonical,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "COP",
      },
    },
  ];

  if (page) {
    schema.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: `${baseUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.breadcrumbLabel,
          item: canonical,
        },
      ],
    });
  }

  return {
    title,
    description,
    canonical,
    ogImage,
    ogTitle,
    ogDescription,
    schema,
  };
}

function renderPrerenderedBody(page) {
  const bullets = page.bullets
    .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
    .join("");
  const sections = page.sections
    .map(
      (section) => `
      <section class="seo-section">
        <h2>${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.body)}</p>
      </section>`,
    )
    .join("");

  return `
    <main id="seo-prerender" data-seo-route="${escapeHtml(page.route)}">
      <article class="seo-article">
        <p class="seo-eyebrow">${escapeHtml(page.eyebrow)}</p>
        <h1>${escapeHtml(page.heroTitle)}</h1>
        <p class="seo-lead">${escapeHtml(page.heroBody)}</p>
        <section class="seo-highlight">
          <h2>${escapeHtml(page.breadcrumbLabel)}</h2>
          <p>${escapeHtml(page.description)}</p>
          <ul>${bullets}</ul>
        </section>
        ${sections}
      </article>
    </main>
  `;
}

function injectSeoMetadata(filePath, page) {
  if (!fs.existsSync(filePath)) return false;

  const seo = buildSeoPayload(page);
  let html = fs.readFileSync(filePath, "utf8");

  html = removeSeoTags(html);
  html = html.replace(/<html\b([^>]*)>/i, (_match, attrs) => {
    const normalizedAttrs = String(attrs).replace(/\s+lang="[^"]*"/gi, "");
    return `<html lang="es-CO"${normalizedAttrs}>`;
  });
  html = html.replace(
    /<title\b[^>]*>.*?<\/title>/i,
    `<title>${escapeHtml(seo.title)}</title>`,
  );

  const headInsert = [
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${seo.canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="es_CO" />`,
    `<meta property="og:site_name" content="${escapeHtml(appName)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.ogDescription)}" />`,
    `<meta property="og:url" content="${seo.canonical}" />`,
    `<meta property="og:image" content="${seo.ogImage}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${seo.ogImage}" />`,
    `<meta name="theme-color" content="#0F2640" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    `<style id="seo-prerender-style">
      #seo-prerender{max-width:960px;margin:0 auto;padding:48px 20px 56px;color:#10243c;background:#fff;font-family:Georgia,"Times New Roman",serif;line-height:1.75}
      #seo-prerender .seo-article{display:block}
      #seo-prerender .seo-eyebrow{margin:0 0 12px;color:#8a6a2f;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-family:Arial,sans-serif}
      #seo-prerender h1,#seo-prerender h2{font-family:Arial,sans-serif;line-height:1.2;color:#0f2640}
      #seo-prerender h1{margin:0 0 16px;font-size:42px}
      #seo-prerender h2{margin:0 0 12px;font-size:28px}
      #seo-prerender p{margin:0 0 18px;font-size:18px}
      #seo-prerender .seo-lead{font-size:22px;color:#31455d}
      #seo-prerender .seo-highlight{padding:24px;border:1px solid #d7e1eb;border-radius:18px;background:#f8fafc;margin:28px 0}
      #seo-prerender ul{margin:0;padding-left:24px}
      #seo-prerender li{margin:0 0 10px;font-size:17px}
      #seo-prerender .seo-section{margin-top:28px}
      html.js-seo-hydrated #seo-prerender{display:none!important}
      @media (max-width:768px){#seo-prerender{padding:32px 18px 40px}#seo-prerender h1{font-size:34px}#seo-prerender h2{font-size:24px}#seo-prerender p,#seo-prerender li{font-size:17px}#seo-prerender .seo-lead{font-size:20px}}
    </style>`,
    `<script id="seo-prerender-script">window.addEventListener("load",function(){document.documentElement.classList.add("js-seo-hydrated");});</script>`,
    `<script id="seo-structured-data" type="application/ld+json">${JSON.stringify(
      seo.schema,
    )}</script>`,
  ].join("\n    ");

  html = html.replace("</head>", `    ${headInsert}\n  </head>`);

  if (page) {
    html = html.replace(
      /<main id="seo-prerender"[\s\S]*?<\/main>\s*/i,
      "",
    );
    html = html.replace(
      /(<body[^>]*>)/i,
      `$1${renderPrerenderedBody(page)}`,
    );
  }

  fs.writeFileSync(filePath, html);
  return true;
}

function injectLegacyRedirect(filePath, redirect) {
  if (!fs.existsSync(filePath)) return false;

  const canonicalUrl = `${baseUrl}${redirect.toPath}`;
  let html = fs.readFileSync(filePath, "utf8");

  html = removeSeoTags(html);
  html = html.replace(/<html\b([^>]*)>/i, (_match, attrs) => {
    const normalizedAttrs = String(attrs).replace(/\s+lang="[^"]*"/gi, "");
    return `<html lang="es-CO"${normalizedAttrs}>`;
  });
  html = html.replace(
    /<title\b[^>]*>.*?<\/title>/i,
    `<title>Redireccionando a ${escapeHtml(appName)}</title>`,
  );

  const headInsert = [
    `<meta name="robots" content="noindex, follow" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta http-equiv="refresh" content="0; url=${canonicalUrl}" />`,
  ].join("\n    ");

  html = html.replace("</head>", `    ${headInsert}\n  </head>`);
  html = html.replace(
    /<body[^>]*>[\s\S]*<\/body>/i,
    `<body><p>Redireccionando a <a href="${canonicalUrl}">${canonicalUrl}</a></p></body>`,
  );

  fs.writeFileSync(filePath, html);
  return true;
}

function injectRouteSeoPages() {
  let updatedCount = 0;

  for (const [output, page] of seoPageMap.entries()) {
    const filePath = path.join(distDir, output);
    if (!fs.existsSync(filePath)) continue;
    if (injectSeoMetadata(filePath, page)) {
      updatedCount += 1;
    }
  }

  for (const redirect of legacyRedirects) {
    const filePath = path.join(distDir, redirect.output);
    if (injectLegacyRedirect(filePath, redirect)) {
      updatedCount += 1;
    }
  }

  return updatedCount;
}

function writeRobots() {
  const publicRobotsPath = path.join(projectRoot, "public", "robots.txt");
  const robots = fs.existsSync(publicRobotsPath)
    ? fs.readFileSync(publicRobotsPath, "utf8")
    : `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`;

  fs.writeFileSync(path.join(distDir, "robots.txt"), robots);
}

function buildSitemapXml() {
  const now = new Date().toISOString();
  const urls = [
    ...seoPages.pages.map((page) => ({
      loc: `${baseUrl}${page.route}`,
      priority: page.route === "/" ? "1.0" : "0.8",
      changefreq: "weekly",
    })),
  ];

  const uniqueUrls = Array.from(new Map(urls.map((url) => [url.loc, url])).values());

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
}

function writeSitemap() {
  const sitemap = buildSitemapXml();
  fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemap);
  fs.writeFileSync(path.join(projectRoot, "public", "sitemap.xml"), sitemap);
}

function writeWebManifest() {
  const manifest = {
    name: appName,
    short_name: appName,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0F2640",
    description:
      "Software de gestion juridica para abogados, bufetes y clientes.",
    icons: [
      {
        src: "/assets/images/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/assets/images/favicon.png",
        sizes: "48x48",
        type: "image/png",
      },
    ],
  };

  fs.writeFileSync(
    path.join(distDir, "site.webmanifest"),
    JSON.stringify(manifest, null, 2),
  );
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error("dist directory not found. Run the web export first.");
    process.exit(1);
  }

  const replacements = copyFontsAndBuildMap();
  rewriteReferences(replacements);
  const updatedPages = injectRouteSeoPages();
  writeRobots();
  writeSitemap();
  writeWebManifest();

  console.log(
    `[postprocess-web-build] Rewrote ${replacements.size} font asset reference(s), injected SEO into ${updatedPages} route page(s), and regenerated sitemap.xml.`,
  );
}

main();
