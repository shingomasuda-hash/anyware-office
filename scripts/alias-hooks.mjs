// Minimal resolver hook so plain-Node scripts can import product modules
// that use the "@/..." path alias. Dev tooling only — never bundled.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = path.join(process.cwd(), "src");
const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx", ""];

export function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = path.join(SRC, specifier.slice(2));
    for (const ext of EXTS) {
      const file = base + ext;
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return next(pathToFileURL(file).href, context);
      }
    }
  }
  return next(specifier, context);
}
