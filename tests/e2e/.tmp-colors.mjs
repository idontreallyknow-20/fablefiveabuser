// Temp visual check for color coding. Run: node tests/e2e/.tmp-colors.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const SHOTS = "/tmp/orbit-shots";
mkdirSync(SHOTS, { recursive: true });

const name = `Color QA ${Date.now().toString().slice(-5)}`;
const results = [];
const check = (label, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

try {
  // ---- sign in ----
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill("qa@orbit.local");
  await page.getByLabel("Password").fill("orbit-e2e-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/today", { timeout: 20000 });
  check("signed in", true);

  // ---- create a project with a color ----
  await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("radio", { name: "mint" }).click();
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForTimeout(1200);

  const card = page.locator("article", { hasText: name }).first();
  await card.waitFor({ timeout: 8000 });
  const bar = card.locator('span[aria-hidden]').first();
  const barStyle = await bar.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, w: s.width };
  });
  check(
    "project card shows 3px mint accent bar",
    barStyle.w === "3px" && barStyle.bg.includes("111, 199, 168"),
    JSON.stringify(barStyle),
  );
  await page.screenshot({ path: `${SHOTS}/colors-01-projects.png` });

  // ---- open the project, add a task ----
  await card.getByRole("link", { name }).click();
  await page.waitForURL("**/projects/**", { timeout: 10000 });
  await page.waitForTimeout(800);
  await page.getByLabel(`Add a task to ${name}`).fill("Tinted chip task");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForTimeout(900);

  // dot before the title in the list row
  const row = page.locator("div.surface", { hasText: "Tinted chip task" }).first();
  const listDot = await row
    .locator('span[aria-hidden]')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor)
    .catch(() => "");
  check("task list row shows project dot", listDot.includes("111, 199, 168"), listDot);

  // ---- board view: open edit modal, add a tag, set due date today ----
  await page.getByRole("radio", { name: "Board" }).click().catch(async () => {
    await page.getByRole("button", { name: "Board" }).click();
  });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Tinted chip task/ }).first().click();
  await page.waitForTimeout(500);
  await page.getByLabel("Tags").fill("deep-work");
  await page.getByLabel("Tags").press("Enter");
  await page.waitForTimeout(300);

  const chip = page.locator('span:has-text("deep-work")').first();
  const chipStyle = await chip.evaluate((el) => {
    const s = getComputedStyle(el);
    return { border: s.borderTopColor, bg: s.backgroundColor, color: s.color };
  });
  check(
    "tag chip is tinted (non-neutral border/bg)",
    chipStyle.border !== "rgba(0, 0, 0, 0)" && chipStyle.bg !== "rgba(0, 0, 0, 0)",
    JSON.stringify(chipStyle),
  );
  await page.screenshot({ path: `${SHOTS}/colors-02-tag-chip.png` });

  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await page.getByLabel("Due date").fill(iso);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(800);

  // back to list to capture row (dot + tinted tag chip)
  await page.getByRole("radio", { name: "List" }).click().catch(async () => {
    await page.getByRole("button", { name: "List" }).click();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/colors-03-task-list.png` });

  // ---- calendar: task entry gets the project dot ----
  await page.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const calDot = await page
    .locator("button", { hasText: "Tinted chip task" })
    .first()
    .locator('span[aria-hidden]')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor)
    .catch(() => "");
  check("calendar entry shows project dot", calDot.includes("111, 199, 168"), calDot);
  await page.screenshot({ path: `${SHOTS}/colors-04-calendar.png` });
} catch (e) {
  check("script completed", false, String(e));
  await page.screenshot({ path: `${SHOTS}/colors-99-error.png` }).catch(() => {});
} finally {
  await browser.close();
}

console.log(results.every(Boolean) ? "ALL PASS" : "SOME FAILURES");
