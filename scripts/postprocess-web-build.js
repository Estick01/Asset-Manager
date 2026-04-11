const fs = require("fs");
const path = require("path");

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
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const sourceRoots = [
  path.join(
    assetsDir,
    "node_modules",
    "@expo-google-fonts",
    "inter"
  ),
  path.join(
    assetsDir,
    "node_modules",
    "@expo",
    "vector-icons",
    "build",
    "vendor",
    "react-native-vector-icons",
    "Fonts"
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
      (file) => /\.(ttf|otf|woff|woff2)$/i.test(file)
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
    (file) => /\.(html|js|css|json|map)$/i.test(file)
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

function buildSeoPayload() {
  const title = "Software para abogados en Colombia | ProcesoClaro";
  const description =
    "Gestiona procesos judiciales, clientes y casos en un solo lugar. Software jurídico moderno para abogados y bufetes en Colombia.";
  const canonical = `${baseUrl}/`;
  const ogImage = `${baseUrl}/assets/images/favicon.png`;
  const ogTitle = "ProcesoClaro - Software jurídico";
  const ogDescription = "Gestiona tu firma legal sin caos";
  const schema = {
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
    publisher: {
      "@type": "Organization",
      name: appName,
      url: canonical,
    },
  };

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

function injectSeoMetadata() {
  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) return false;

  const seo = buildSeoPayload();
  let html = fs.readFileSync(indexPath, "utf8");

  html = html.replace(/<html\b([^>]*)>/i, (_match, attrs) => {
    const normalizedAttrs = String(attrs).replace(/\s+lang="[^"]*"/gi, "");
    return `<html lang="es-CO"${normalizedAttrs}>`;
  });
  html = html.replace(/<title\b[^>]*>.*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);

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
    `<script type="application/ld+json">${JSON.stringify(seo.schema)}</script>`,
  ].join("\n    ");

  if (!html.includes('name="description"')) {
    html = html.replace("</head>", `    ${headInsert}\n  </head>`);
  }

  fs.writeFileSync(indexPath, html);
  return true;
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

function writeSitemap() {
  const publicSitemapPath = path.join(projectRoot, "public", "sitemap.xml");
  const sitemap = fs.existsSync(publicSitemapPath)
    ? fs.readFileSync(publicSitemapPath, "utf8")
    : `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
  </url>
</urlset>
`;

  fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemap);
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
    JSON.stringify(manifest, null, 2)
  );
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error("dist directory not found. Run the web export first.");
    process.exit(1);
  }

  const replacements = copyFontsAndBuildMap();
  rewriteReferences(replacements);
  const seoInjected = injectSeoMetadata();
  writeRobots();
  writeSitemap();
  writeWebManifest();

  console.log(
    `[postprocess-web-build] Rewrote ${replacements.size} font asset reference(s) and ${seoInjected ? "applied" : "skipped"} SEO metadata injection.`
  );
}

main();
