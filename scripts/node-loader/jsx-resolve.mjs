/**
 * PRATIKSHYA FASHON — Node ESM resolver hook with JSX support (QA tooling only).
 *
 * `resolve.mjs` lets the test runner import `src/*` services unmodified. This
 * hook extends it so React *components* can also be imported outside Vite:
 * JSX is transformed with Vite's own esbuild pass, and CSS/image imports
 * resolve to inert stubs. That lets `npm run qa:render` server-render the
 * admin, employee and storefront surfaces and assert on the real output
 * instead of trusting that a route returns 200.
 *
 * Production code and the Vite build never load this file.
 */

import { existsSync, statSync } from "node:fs";
import { dirname, extname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";

const EXTENSIONS = [".js", ".jsx", ".mjs", ".json"];
const ASSET_RE = /\.(css|svg|png|jpe?g|webp|gif|avif|woff2?|ttf)$/;
const ASSET_SCHEME = "pf-qa-asset:";

const tryFile = (path) => {
  try {
    if (existsSync(path) && statSync(path).isFile()) return path;
  } catch {
    /* missing */
  }
  return null;
};

export async function resolve(specifier, context, nextResolve) {
  const { parentURL } = context;

  /* Stylesheets and binary assets are Vite concerns; QA renders text. */
  if (ASSET_RE.test(specifier.split("?")[0])) {
    return { url: `${ASSET_SCHEME}${specifier}`, shortCircuit: true };
  }

  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  if (isRelative && parentURL && !specifier.includes("?") && !specifier.includes("#")) {
    const base = fileURLToPath(parentURL);
    const full = resolvePath(dirname(base), specifier);

    if (extname(specifier)) {
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

export async function load(url, context, nextLoad) {
  if (url.startsWith(ASSET_SCHEME)) {
    return {
      format: "module",
      source: "export default {}; export const ref = {};",
      shortCircuit: true,
    };
  }
  if (url.endsWith(".json")) {
    const source = await readFile(fileURLToPath(url), "utf8");
    return { format: "json", source, shortCircuit: true };
  }
  if (url.endsWith(".jsx")) {
    const path = fileURLToPath(url);
    const raw = await readFile(path, "utf8");
    const { code } = await transformWithEsbuild(raw, path, {
      loader: "jsx",
      jsx: "automatic",
      target: "node20",
    });
    return { format: "module", source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
