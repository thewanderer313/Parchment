#!/usr/bin/env node
/* eslint-disable */
// Generate Parchment's app icons and splash icon from SVG sources.
//
// Run from the repo root:
//   node tools/generate-icons.js
//
// Outputs (all 1024×1024 PNG):
//   assets/images/icon.png                       — iOS / launcher icon
//   assets/images/android-icon-foreground.png    — adaptive icon foreground
//   assets/images/android-icon-background.png    — adaptive icon background
//   assets/images/android-icon-monochrome.png    — themed icon silhouette
//   assets/images/splash-icon.png                — splash screen icon
//   assets/images/favicon.png                    — web favicon (smaller)
//
// Design: an open book in forest green over a small editorial
// ornament, on a warm parchment background. Same visual voice as the
// app's chrome (open-book tab icon, ✦ ornaments, EB Garamond).

const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");

const PARCHMENT = "#e8dec5";
const FOREST = "#2f4a35";
const WHITE = "#ffffff";

// Reusable SVG fragments — each takes a stroke color so we can render
// the same shapes in forest green on parchment, or in white for the
// monochrome (themed) icon.
function ornament(color) {
  return `
    <g transform="translate(512, 300)">
      <line x1="-138" y1="0" x2="-30" y2="0" stroke="${color}" stroke-width="7" stroke-linecap="round" />
      <line x1="30" y1="0" x2="138" y2="0" stroke="${color}" stroke-width="7" stroke-linecap="round" />
      <path d="M 0 -20 L 6 -6 L 20 0 L 6 6 L 0 20 L -6 6 L -20 0 L -6 -6 Z"
            fill="${color}" />
    </g>
  `;
}

function book(color) {
  return `
    <g stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="18" fill="none">
      <path d="M 512 410 C 452 384 308 374 188 412 L 188 740 C 308 710 452 710 512 744" />
      <path d="M 512 410 C 572 384 716 374 836 412 L 836 740 C 716 710 572 710 512 744" />
      <path d="M 512 410 L 512 744" stroke-width="12" opacity="0.6" />
    </g>
  `;
}

// Slightly smaller, simpler silhouette for the monochrome (themed)
// icon — Android docs recommend a tighter shape so the system
// background tint reads cleanly behind it.
function bookMonochrome(color) {
  return `
    <g stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="18" fill="none">
      <path d="M 512 410 C 472 392 392 384 352 414 L 352 632 C 392 610 472 610 512 638" />
      <path d="M 512 410 C 552 392 632 384 672 414 L 672 632 C 632 610 552 610 512 638" />
      <path d="M 512 410 L 512 638" stroke-width="14" opacity="0.7" />
    </g>
  `;
}

function ornamentMonochrome(color) {
  return `
    <g transform="translate(512, 340)">
      <line x1="-72" y1="0" x2="-20" y2="0" stroke="${color}" stroke-width="7" stroke-linecap="round" />
      <line x1="20" y1="0" x2="72" y2="0" stroke="${color}" stroke-width="7" stroke-linecap="round" />
      <path d="M 0 -14 L 4 -4 L 14 0 L 4 4 L 0 14 L -4 4 L -14 0 L -4 -4 Z"
            fill="${color}" />
    </g>
  `;
}

// The five SVG variants.
const svgs = {
  // Main launcher / iOS icon: parchment background + book + ornament
  icon: `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${PARCHMENT}" />
  ${ornament(FOREST)}
  ${book(FOREST)}
</svg>`,

  // Android adaptive foreground: book + ornament, transparent bg.
  // (The launcher composes this over the background image below.)
  "android-icon-foreground": `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${ornament(FOREST)}
  ${book(FOREST)}
</svg>`,

  // Android adaptive background: solid parchment.
  "android-icon-background": `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${PARCHMENT}" />
</svg>`,

  // Themed icon (monochrome): tighter silhouette in white. The system
  // tints this based on the user's wallpaper.
  "android-icon-monochrome": `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${ornamentMonochrome(WHITE)}
  ${bookMonochrome(WHITE)}
</svg>`,

  // Splash icon: same as foreground; expo-splash-screen composes it
  // over the configured backgroundColor at the configured imageWidth.
  "splash-icon": `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${ornament(FOREST)}
  ${book(FOREST)}
</svg>`,
};

const outDir = path.join(__dirname, "..", "assets", "images");

function renderSvg(svg, outPath, width = 1024) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "rgba(0,0,0,0)",
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(outPath, png);
  return png.length;
}

for (const [name, svg] of Object.entries(svgs)) {
  const out = path.join(outDir, `${name}.png`);
  const bytes = renderSvg(svg, out);
  console.log(`${name}.png  (${(bytes / 1024).toFixed(1)} KB)`);
}

// Favicon — same icon, smaller. Used by `expo start --web`. 256 px is
// plenty for browser tab rendering and stays tiny on disk.
const faviconBytes = renderSvg(svgs.icon, path.join(outDir, "favicon.png"), 256);
console.log(`favicon.png  (${(faviconBytes / 1024).toFixed(1)} KB)`);

console.log("Done.");
