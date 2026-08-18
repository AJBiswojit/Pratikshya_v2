/**
 * PRATIKSHYA FASHON — Registers the Node resolver/loader hooks so the test
 * runner and the media-exposure audit can import `src/*` modules unmodified.
 *
 * Usage:
 *   node --import ./scripts/node-loader/register.mjs scripts/audit-media.mjs
 */

import { register } from "node:module";

register("./resolve.mjs", new URL("./", import.meta.url).href);
