import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] || "";

const DIR = path.join(decodeURIComponent(path.dirname(new URL(import.meta.url).pathname)), "temporary screenshots");

// Ensure output directory exists
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

// Find next available number
const existing = fs.readdirSync(DIR).filter((f) => f.startsWith("screenshot-") && f.endsWith(".png"));
const nums = existing.map((f) => {
  const match = f.match(/^screenshot-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
});
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outputPath = path.join(DIR, filename);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const mobile = process.argv.includes('--mobile');
await page.setViewport({ width: mobile ? 390 : 1440, height: mobile ? 844 : 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });

// Wait for fonts to load
await new Promise((r) => setTimeout(r, 1500));

// Scroll through the page to trigger IntersectionObserver animations
await page.evaluate(async () => {
  const distance = 400;
  const delay = 100;
  const scrollHeight = document.body.scrollHeight;
  let currentPosition = 0;
  while (currentPosition < scrollHeight) {
    window.scrollBy(0, distance);
    currentPosition += distance;
    await new Promise(r => setTimeout(r, delay));
  }
  // Scroll back to top for full-page screenshot
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
});

// Wait for animations to complete
await new Promise((r) => setTimeout(r, 1000));

await page.screenshot({ path: outputPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: ${outputPath}`);
