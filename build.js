#!/usr/bin/env node

const esbuild = require("esbuild");
const { sassPlugin } = require("esbuild-sass-plugin");
const fs = require("fs");
const path = require("path");

const watch = process.argv.includes("--watch");
const distDir = path.resolve(__dirname, "dist");

// Ensure dist directory exists
fs.mkdirSync(distDir, { recursive: true });

// Copy static files to dist
for (const file of ["manifest.json", "index.html"]) {
    fs.copyFileSync(
        path.resolve(__dirname, "src", file),
        path.resolve(distDir, file),
    );
}

const context = esbuild.context({
    entryPoints: ["src/index.tsx"],
    bundle: true,
    outdir: "dist",
    loader: { ".js": "jsx" },
    external: ["*.woff", "*.woff2", "*.png", "*.svg"],
    plugins: [sassPlugin()],
    minify: !watch,
    sourcemap: watch,
});

context.then(async (ctx) => {
    if (watch) {
        await ctx.watch();
        console.log("Watching for changes...");
    } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log("Build complete.");
    }
});
