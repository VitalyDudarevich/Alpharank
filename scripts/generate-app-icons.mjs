import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appDir = join(root, "app");
const publicIconsDir = join(root, "public", "icons");

const sourceCandidates = [
  join(root, "assets", "app-icon-source.png"),
  join(appDir, "icon.png"),
];
const sourcePath =
  sourceCandidates.find((p) => existsSync(p)) ?? join(appDir, "icon.png");

async function pngBuffer(size) {
  return sharp(sourcePath)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9, quality: 85 })
    .toBuffer();
}

async function main() {
  mkdirSync(publicIconsDir, { recursive: true });

  const icon512 = await pngBuffer(512);
  const icon192 = await sharp(sourcePath).resize(192, 192, { fit: "cover" }).png().toBuffer();
  const icon180 = await sharp(sourcePath).resize(180, 180, { fit: "cover" }).png().toBuffer();
  const icon32 = await pngBuffer(32);
  const icon16 = await pngBuffer(16);

  writeFileSync(join(appDir, "icon.png"), icon512);
  writeFileSync(join(appDir, "apple-icon.png"), icon180);

  writeFileSync(join(publicIconsDir, "icon-192.png"), icon192);
  writeFileSync(join(publicIconsDir, "icon-512.png"), icon512);

  const faviconIco = await toIco([icon16, icon32, await pngBuffer(48)]);
  writeFileSync(join(appDir, "favicon.ico"), faviconIco);
  writeFileSync(join(root, "public", "favicon.ico"), faviconIco);
  writeFileSync(join(root, "public", "icon.png"), icon512);

  console.log("Icons generated: app/icon.png, app/favicon.ico, public/icons/*.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
