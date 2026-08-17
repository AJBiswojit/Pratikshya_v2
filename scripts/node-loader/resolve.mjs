/**
 * PRATIKSHYA FASHON — Node ESM resolver hook (test / audit tooling only).
 *
 * The application is bundled by Vite, which resolves extensionless relative
 * imports and bare `.json` imports. Node's ESM loader does neither, so the
 * test runner and the media-exposure audit register this hook to import the
 * same `src/*` modules unmodified. Production code and the Vite build never
 * load this file.
 */

import { existsSync, statSync } from "node:fs";
import { dirname, extname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

const EXTENSIONS = [".js", ".jsx", ".mjs", ".json"];

const tryFile = (path) => {
  try {
    if (existsSync(path) && statSync(path).isFile()) return path;
  } catch {
    /* missing */
  }
  return null;
};

/** Extensionless relative import → try .js/.jsx/.mjs/.json, then index. */
export async function resolve(specifier, context, nextResolve) {
  const { parentURL } = context;
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  if (isRelative && parentURL && !specifier.includes("?") && !specifier.includes("#")) {
    const base = fileURLToPath(parentURL);
    const full = resolvePath(dirname(base), specifier);

    if (extname(specifier)) {
      /* Keep explicit paths, but JSON needs a synthetic module (Node still
         requires `with { type: "json" }` for native JSON imports). */
      if (extname(specifier) === ".json") {
        return { url: pathToFileURL(full).href, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    }

    for (const ext of EXTENSIONS) {
      const hit = tryFile(full + ext);
      if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
    }
    for (const ext of EXTENSIONS) {
      const hit = tryFile(resolvePath(full, `index${ext}`));
      if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

/** `.json` modules load as `json` so `import x from "./file.json"` works. */
export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    const source = await readFile(fileURLToPath(url), "utf8");
    return { format: "json", source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
