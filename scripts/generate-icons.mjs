import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "public", "icons");
mkdirSync(dir, { recursive: true });

// Minimal valid 1x1 purple PNG expanded - use SVG as fallback in manifest instead
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#7c3aed"/>
  <text x="256" y="300" font-size="220" text-anchor="middle" fill="white" font-family="sans-serif">α</text>
</svg>`;

writeFileSync(join(dir, "icon.svg"), svg);
console.log("Created public/icons/icon.svg - add PNGs or use SVG in manifest");
