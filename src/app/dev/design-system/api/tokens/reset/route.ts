import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { resetTokenValues } from "../../../tokenCss";

const TOKENS_CSS_RELATIVE_PATH = "src/styles/tokens.css";
const TOKENS_CSS_PATH = path.join(process.cwd(), TOKENS_CSS_RELATIVE_PATH);

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  let reset: string;
  try {
    const cssText = readFileSync(TOKENS_CSS_PATH, "utf8");
    const committedCssText = execFileSync(
      "git",
      ["show", `HEAD:${TOKENS_CSS_RELATIVE_PATH}`],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    reset = resetTokenValues(cssText, committedCssText);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  writeFileSync(TOKENS_CSS_PATH, reset, "utf8");

  return NextResponse.json({ ok: true });
}
