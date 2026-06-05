#!/usr/bin/env node
/* eslint-disable */
// Generate Parchment's app icons from picon.png (illuminated capital P
// master) and re-emit the variants Expo / Android need.
//
// Run from the repo root:
//   node tools/generate-icons.js
//
// Inputs:
//   assets/images/picon.png           — 1254×1254 illuminated P master
//   assets/images/splashscreen.png    — full-bleed splash scene
//
// Outputs:
//   assets/images/icon.png                    — iOS / launcher icon
//   assets/images/android-icon-foreground.png — adaptive foreground
//   assets/images/android-icon-background.png — adaptive background
//   assets/images/android-icon-monochrome.png — themed-icon silhouette
//   assets/images/favicon.png                 — web favicon
//
// Note: splashscreen.png is used directly by expo-splash-screen via
// app.json — no derived variant needed.
//
// The monochrome icon is generated from an open-book SVG rather than
// derived from the painterly P, because Android themed icons need a
// flat solid-color silhouette that wouldn't translate from the
// illuminated capital's gradients and gold leaf.

const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const IMG_DIR = path.join(ROOT, "assets", "images");
const PICON = path.join(IMG_DIR, "picon.png");

// Aged-parchment colour sampled from picon.png's edge midpoints —
// where the Android adaptive mask boundary typically lands. Using
// this for the background image means the parchment-vignetted P
// foreground composites onto a near-identical underlying tone after
// the mask is applied, with no visible color step at the boundary.
const ADAPTIVE_BG = "#cc9740";

// Monochrome (themed icon) — solid white open-book silhouette on
// transparent. Same shape as the Study tab icon, scaled up. Android
// tints this based on the user's wallpaper at runtime.
const MONOCHROME_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g transform="translate(512, 340)">
    <line x1="-72" y1="0" x2="-20" y2="0" stroke="#ffffff" stroke-width="7" stroke-linecap="round" />
    <line x1="20" y1="0" x2="72" y2="0" stroke="#ffffff" stroke-width="7" stroke-linecap="round" />
    <path d="M 0 -14 L 4 -4 L 14 0 L 4 4 L 0 14 L -4 4 L -14 0 L -4 -4 Z" fill="#ffffff" />
  </g>
  <g stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="18" fill="none">
    <path d="M 512 410 C 472 392 392 384 352 414 L 352 632 C 392 610 472 610 512 638" />
    <path d="M 512 410 C 552 392 632 384 672 414 L 672 632 C 632 610 552 610 512 638" />
    <path d="M 512 410 L 512 638" stroke-width="14" opacity="0.7" />
  </g>
</svg>`;

// Solid-fill adaptive background — just a coloured square, no shape.
const ADAPTIVE_BG_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${ADAPTIVE_BG}" />
</svg>`;

function renderSvg(svg, outPath, width = 1024) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "rgba(0,0,0,0)",
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(outPath, png);
  return png.length;
}

function copy(src, dest) {
  fs.copyFileSync(src, dest);
  return fs.statSync(dest).size;
}

const tasks = [
  // The painterly P master goes straight to:
  //   - icon.png (iOS / launcher)
  //   - android-icon-foreground.png (adaptive foreground; its parchment
  //     edges blend into the matching solid bg below after masking)
  () => copy(PICON, path.join(IMG_DIR, "icon.png")),
  () => copy(PICON, path.join(IMG_DIR, "android-icon-foreground.png")),
  // Adaptive background: solid parchment matching the picon edge tone.
  () => renderSvg(ADAPTIVE_BG_SVG, path.join(IMG_DIR, "android-icon-background.png")),
  // Themed icon silhouette: SVG open book in white.
  () => renderSvg(MONOCHROME_SVG, path.join(IMG_DIR, "android-icon-monochrome.png")),
  // Web favicon — smaller copy of the main icon.
  () => copy(PICON, path.join(IMG_DIR, "favicon.png")),
];

const labels = [
  "icon.png",
  "android-icon-foreground.png",
  "android-icon-background.png",
  "android-icon-monochrome.png",
  "favicon.png",
];

tasks.forEach((task, i) => {
  const bytes = task();
  console.log(`${labels[i]}  (${(bytes / 1024).toFixed(1)} KB)`);
});

console.log("Done.");
