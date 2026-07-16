import { chromium } from "@playwright/test";

const [url, out, w = "1920", h = "1080", wait = "4000"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch((e) => console.log("goto:", e.message));
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.slice(0, 12).join("\n"));
else console.log("no console errors");
await browser.close();
