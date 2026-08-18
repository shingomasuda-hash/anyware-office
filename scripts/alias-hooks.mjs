// Minimal resolver hook so plain-Node scripts can import product modules
// that use the "@/..." path alias. Dev tooling only — never bundled.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = path.join(process.cwd(), "src");
const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx", ""];

function tryExtensions(base, context, next) {
  for (const ext of EXTS) {
    const file = base + ext;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return next(pathToFileURL(file).href, context);
    }
  }
  return null;
}

export function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const hit = tryExtensions(path.join(SRC, specifier.slice(2)), context, next);
    if (hit) return hit;
  }
  // TypeScript source imports its siblings without an extension, which
  // Node's ESM resolver will not do on its own.
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) {
    const base = path.resolve(path.dirname(new URL(context.parentURL).pathname), specifier);
    const hit = tryExtensions(base, context, next);
    if (hit) return hit;
  }
  return next(specifier, context);
}
