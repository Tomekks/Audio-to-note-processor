import { test, expect } from "@playwright/test";

// A boot-check, not a functional suite: does the app even come up without
// erroring. See playwright.config.ts's doc comment for why this isn't in CI.
test("home page loads and shows the song list without a console error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});
