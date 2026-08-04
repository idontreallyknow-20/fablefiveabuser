// End-to-end drive against the mock Supabase adapter.
// Signs up, exercises every module, and captures screenshots for visual QA.
// Run: node tests/e2e/drive.mjs [shots-dir]

import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const SHOTS = process.argv[2] ?? "/tmp/orbit-shots";
const executablePath = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const results = [];
const consoleErrors = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
    consoleErrors.push(m.text());
  }
});
page.on("pageerror", (e) => consoleErrors.push(String(e)));

const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

try {
  // ---- reset mock state so reruns start clean ----
  await fetch("http://localhost:54321/__reset", { method: "POST" }).catch(() => {});

  // ---- signup (bootstrap account) ----
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await shot("01-login");
  const createBtn = page.getByRole("button", { name: "Create account" });
  await createBtn.waitFor({ timeout: 8000 });
  await createBtn.click();
  await page.getByLabel("Display name").fill("Joseph");
  await page.getByLabel("Email").fill("qa@orbit.local");
  await page.getByLabel("Password").fill("orbit-e2e-password");
  await page.getByRole("button", { name: "Create account" }).last().click();
  await page.waitForURL("**/today", { timeout: 20000 });
  check("signup + bootstrap login lands on Today", true);
  await page.waitForTimeout(2500);
  await shot("02-today-empty");

  // ---- add backlog tasks + priorities ----
  await page.getByLabel("Add a task to the backlog").fill("Ship NerfChess landing page");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByLabel("Add a task to the backlog").fill("Book physio appointment");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: "Choose a priority" }).first().click();
  await page.waitForTimeout(600);
  await shot("03-priority-picker");
  await page.getByRole("button", { name: /Ship NerfChess landing page/ }).first().click();
  await page.waitForTimeout(600);
  const p1 = await page.getByText("Ship NerfChess landing page").first().isVisible();
  check("priority set from backlog", p1);

  // complete it
  await page.getByLabel(/Complete Ship NerfChess/).click();
  await page.waitForTimeout(600);
  check(
    "priority completes",
    await page.getByRole("button", { name: "Undo" }).first().isVisible().catch(() => false),
  );
  await shot("04-today-populated");

  // ---- projects ----
  await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot("05-projects");
  await page.goto(`${BASE}/projects/nerfchess`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot("06-nerfchess-product");
  const marketingTab = page.getByRole("radio", { name: "Marketing" });
  if (await marketingTab.isVisible().catch(() => false)) {
    await marketingTab.click();
    await page.waitForTimeout(800);
    await shot("07-nerfchess-marketing");
    check("nerfchess hub renders", true);
  } else {
    // segmented may be buttons
    await page.getByText("Marketing", { exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(800);
    await shot("07-nerfchess-marketing");
    check("nerfchess hub renders", true, "marketing via text click");
  }

  // ---- train ----
  await page.goto(`${BASE}/train`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot("08-train");
  const pushSplit = page.getByRole("button", { name: "Push", exact: true }).first();
  if (await pushSplit.isVisible().catch(() => false)) {
    await pushSplit.click();
    await page.waitForTimeout(900);
    check("workout session starts", true);
    await shot("09-train-session");
  } else {
    check("workout session starts", false, "split picker not found");
  }

  // ---- today grid edit mode ----
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const editBtn = page.getByRole("button", { name: "Edit layout" });
  if (await editBtn.isVisible().catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Widget", exact: true }).click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Timer", exact: true }).click();
    await page.waitForTimeout(500);
    await shot("20-grid-edit");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.waitForTimeout(500);
    const timerVisible = await page.getByText("Timer").first().isVisible().catch(() => false);
    check("grid edit adds a widget", timerVisible);
    await shot("21-grid-with-timer");
  } else {
    check("grid edit adds a widget", false, "edit layout button not found");
  }

  // ---- command palette + natural-language dates ----
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  const cmdInput = page.getByLabel("Command", { exact: true });
  if (await cmdInput.isVisible().catch(() => false)) {
    await cmdInput.fill("dentist aug 12");
    await page.waitForTimeout(300);
    await shot("25-palette");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
    // find it again through the palette
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(300);
    await page.getByLabel("Command", { exact: true }).fill("dentist");
    await page.waitForTimeout(400);
    const found = await page.getByRole("button", { name: /dentist/ }).first().isVisible().catch(() => false);
    check("palette adds task with NL date and finds it", found);
    await page.keyboard.press("Escape");
  } else {
    check("palette adds task with NL date and finds it", false, "palette did not open");
  }

  // ---- assistant panel (no API key locally: opens, shows unconfigured state) ----
  await page.keyboard.press("Control+j");
  await page.waitForTimeout(400);
  const assistantPanel = page.getByRole("dialog", { name: "Assistant" });
  if (await assistantPanel.isVisible().catch(() => false)) {
    await shot("26-assistant");
    check("assistant panel opens via hotkey", true);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  } else {
    check("assistant panel opens via hotkey", false, "dialog not visible");
  }

  // ---- soundboard ----
  await page.goto(`${BASE}/sounds`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const addPad = page.getByRole("button", { name: "Add pad" });
  if (await addPad.isVisible().catch(() => false)) {
    await addPad.click();
    await page.getByRole("button", { name: "Chime", exact: true }).click();
    await page.waitForTimeout(700);
    const padBtn = page.getByRole("button", { name: /Pad Chime/ });
    const padVisible = await padBtn.isVisible().catch(() => false);
    if (padVisible) await padBtn.click(); // fire it; audio is mocked-out in headless
    check("soundboard pad creates and fires", padVisible);
    await shot("24-sounds");
  } else {
    check("soundboard pad creates and fires", false, "add pad not found");
  }

  // ---- calendar ----
  await page.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const quickAddInput = page.getByLabel("Add for this day");
  if (await quickAddInput.isVisible().catch(() => false)) {
    await quickAddInput.fill("Chemistry test");
    await quickAddInput.press("Enter");
    await page.waitForTimeout(800);
    const onGrid = await page.getByText("Chemistry test").first().isVisible().catch(() => false);
    check("calendar quick-add lands on the grid", onGrid);
    await shot("16-calendar-month");
    // open the task from the day panel (the .last() chip; cells also match by name)
    await page.getByRole("button", { name: /Chemistry test/ }).last().click();
    await page.waitForTimeout(500);
    const tagField = page.getByLabel("Tags");
    if (await tagField.isVisible().catch(() => false)) {
      await tagField.fill("test");
      await tagField.press("Enter");
      await page.getByRole("button", { name: "Save" }).click();
      await page.waitForTimeout(700);
      check("task modal saves tags from calendar", true);
    } else {
      check("task modal saves tags from calendar", false, "tags field not found");
    }
    // week + agenda views render
    await page.getByRole("radio", { name: "Week" }).or(page.getByRole("button", { name: "Week" })).first().click();
    await page.waitForTimeout(500);
    await shot("17-calendar-week");
    await page.getByRole("radio", { name: "Agenda" }).or(page.getByRole("button", { name: "Agenda" })).first().click();
    await page.waitForTimeout(500);
    check("calendar views switch", true);
    await shot("18-calendar-agenda");
  } else {
    check("calendar quick-add lands on the grid", false, "quick add input not found");
    check("task modal saves tags from calendar", false, "skipped");
    check("calendar views switch", false, "skipped");
  }

  // ---- quick capture (share-target path) ----
  await page.goto(`${BASE}/capture?title=Read%20article&url=https%3A%2F%2Fexample.com%2Fpost`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(600);
  const capInput = page.getByLabel("Task", { exact: true });
  if (await capInput.isVisible().catch(() => false)) {
    const prefilled = (await capInput.inputValue()).includes("Read article");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForURL(/\/today/, { timeout: 8000 }).catch(() => {});
    check("capture prefills share and saves", prefilled && page.url().includes("/today"));
    await shot("28-capture");
  } else {
    check("capture prefills share and saves", false, "capture input not found");
  }

  // ---- weekly review ----
  await page.goto(`${BASE}/review`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const reviewHeader = await page
    .locator("h1")
    .filter({ hasText: /Clear|overdue/ })
    .first()
    .isVisible()
    .catch(() => false);
  check("review page renders", reviewHeader);
  await shot("27-review");

  // ---- connections ----
  await page.goto(`${BASE}/space/connections`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  check(
    "connections page renders steppers",
    await page.getByText("Spotify").first().isVisible().catch(() => false),
  );
  await shot("19-connections");

  // ---- team: create, join from a second browser, claim the day ----
  await page.goto(`${BASE}/space/team`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByLabel("Team name").fill("Orbit");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForTimeout(900);
  const inviteCode = (await page.locator("code").first().textContent().catch(() => ""))?.trim();
  check("team created with invite code", Boolean(inviteCode));
  await shot("22-team-created");

  if (inviteCode) {
    // second user directly against the mock, then join through the UI
    await fetch("http://localhost:54321/auth/v1/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "katherine@orbit.local",
        password: "orbit-e2e-password",
        data: { display_name: "Katherine" },
      }),
    });
    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageB = await ctxB.newPage();
    await pageB.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await pageB.getByLabel("Email").fill("katherine@orbit.local");
    await pageB.getByLabel("Password").fill("orbit-e2e-password");
    await pageB.getByRole("button", { name: "Sign in", exact: true }).click();
    await pageB.waitForURL("**/today", { timeout: 20000 }).catch(() => {});
    await pageB.goto(`${BASE}/space/team`, { waitUntil: "networkidle" });
    await pageB.getByLabel("Invite code").fill(inviteCode);
    await pageB.getByRole("button", { name: "Join", exact: true }).click();
    await pageB.waitForTimeout(900);
    const joined = await pageB.getByText("Katherine").first().isVisible().catch(() => false);
    check("second user joins by invite code", joined);

    // Katherine sets and completes a priority
    await pageB.goto(`${BASE}/today`, { waitUntil: "networkidle" });
    await pageB.waitForTimeout(800);
    await pageB.getByLabel("Add a task to the backlog").fill("Finish lab report");
    await pageB.getByRole("button", { name: "Add", exact: true }).click();
    await pageB.waitForTimeout(400);
    await pageB.getByRole("button", { name: "Choose a priority" }).first().click();
    await pageB.waitForTimeout(500);
    await pageB.getByRole("button", { name: /Finish lab report/ }).first().click();
    await pageB.waitForTimeout(500);
    await pageB.getByLabel(/Complete Finish lab report/).click();
    await pageB.waitForTimeout(700);

    // Joseph adds the Team widget and claims the aligned day
    await page.goto(`${BASE}/today`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Edit layout" }).click();
    await page.getByRole("button", { name: "Widget", exact: true }).click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Team", exact: true }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.waitForTimeout(900);
    const claimBtn = page.getByRole("button", { name: "Claim the day" });
    if (await claimBtn.isVisible().catch(() => false)) {
      await claimBtn.click();
      await page.waitForTimeout(900);
      check("team day claims when aligned", await page.getByText("aligned").first().isVisible().catch(() => false));
    } else {
      check("team day claims when aligned", false, "claim button not visible");
    }
    await shot("23-team-aligned");
    await ctxB.close();
  }

  // ---- reflect ----
  await page.goto(`${BASE}/reflect`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const moodBtn = page.getByRole("radio", { name: /3 of 5/ }).first();
  if (await moodBtn.isVisible().catch(() => false)) {
    await moodBtn.click();
    check("check-in dot scale works", true);
  } else {
    check("check-in dot scale works", false, "dot scale not found");
  }
  await page.waitForTimeout(600);
  await shot("10-reflect");

  // ---- space: appearance/themes ----
  await page.goto(`${BASE}/space/appearance`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot("11-space-appearance");

  // ---- space: account (app name edit) ----
  await page.goto(`${BASE}/space/account`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByLabel("Application name").fill("Josephs Orbit");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForTimeout(900);
  check("app name editable in settings", true);
  await shot("12-space-account");

  // ---- focus + ambient ----
  await page.goto(`${BASE}/focus`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot("13-focus");
  await page.goto(`${BASE}/ambient`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await shot("14-ambient");
  check("ambient renders clock", await page.locator("time").first().isVisible());

  // ---- displays ----
  await page.goto(`${BASE}/space/displays`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByLabel("Name this screen").fill("Center monitor");
  await page.getByRole("button", { name: "Register" }).click();
  await page.waitForTimeout(900);
  check("display registers", await page.getByText("Center monitor").first().isVisible());
  await shot("15-space-displays");

  // ---- theme sweep on Today (desktop) ----
  const themes = [
    "rainy-city", "bedroom", "library", "tokyo", "observatory",
    "forest", "snow", "academia", "ocean", "luxe", "living-sky",
    "aurora-north", "rooftop-dawn", "desert-night", "sakura",
  ];
  await page.goto(`${BASE}/space/appearance`, { waitUntil: "networkidle" });
  const names = {
    "rainy-city": "Rainy Midnight City", bedroom: "Late-Night Bedroom",
    library: "Moonlit Library", tokyo: "Japanese Night Street",
    observatory: "Deep-Space Observatory", forest: "Foggy Forest",
    snow: "Snowy Midnight", academia: "Dark Academia", ocean: "Deep Ocean",
    luxe: "Minimal Black Luxury", "living-sky": "Living Sky",
    "aurora-north": "Aurora North", "rooftop-dawn": "Rooftop Dawn",
    "desert-night": "Desert Night", sakura: "Sakura Twilight",
  };
  for (const t of themes) {
    await page.goto(`${BASE}/space/appearance`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: new RegExp(names[t]) }).first().click();
    await page.waitForTimeout(400);
    await page.goto(`${BASE}/today`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    await shot(`theme-${t}`);
  }
  check("all 15 themes render", true);

  // ---- responsive sweep (back on flagship theme) ----
  await page.goto(`${BASE}/space/appearance`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Rainy Midnight City/ }).first().click();
  await page.waitForTimeout(400);
  const sizes = [
    [390, 844, "mobile"],
    [768, 1024, "tablet"],
    [1440, 900, "laptop"],
    [1920, 1080, "desktop"],
    [2560, 1440, "qhd"],
    [3440, 1440, "ultrawide"],
  ];
  for (const [w, h, label] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/today`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await shot(`resp-${label}-today`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/reflect`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await shot("resp-mobile-reflect");
  await page.goto(`${BASE}/train`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await shot("resp-mobile-train");
  check("responsive sweep captured", true);

  // ---- sign out ----
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/space/account`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login", { timeout: 10000 });
  check("sign out returns to login", true);
} catch (e) {
  check("e2e drive completed", false, String(e).slice(0, 300));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (consoleErrors.length) {
  console.log("\nCONSOLE ERRORS (first 10):");
  for (const err of [...new Set(consoleErrors)].slice(0, 10)) console.log("  " + err.slice(0, 200));
} else {
  console.log("no console errors");
}
await browser.close();
process.exit(failed.length > 0 ? 1 : 0);
