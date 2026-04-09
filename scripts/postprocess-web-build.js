const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const assetsDir = path.join(distDir, "assets");
const outputFontsDir = path.join(assetsDir, "fonts");

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

function main() {
  if (!fs.existsSync(distDir)) {
    console.error("dist directory not found. Run the web export first.");
    process.exit(1);
  }

  const replacements = copyFontsAndBuildMap();
  rewriteReferences(replacements);

  console.log(
    `[postprocess-web-build] Rewrote ${replacements.size} font asset reference(s).`
  );
}

main();
