﻿import { defineConfig } from "tsup";

export default defineConfig({
    entry: { index: "src/index.ts" },
    format: ["esm","cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    platform: "browser",
    target: "es2019",
    treeshake: true,
    minify: false
});