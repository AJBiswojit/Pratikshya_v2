import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./jsx-resolve.mjs", pathToFileURL(import.meta.filename));
