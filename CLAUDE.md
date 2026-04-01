# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

cockpit-plakar is a Cockpit plugin for managing Plakar backups on a NAS. It shells out to the `plakar` CLI and displays results in Cockpit panels.

- **Framework:** PatternFly/React Cockpit plugin
- **Backend approach:** Shell out to `plakar` CLI, capture and display output
- **Config location:** `~/.config/cockpit-plakar/`
- **Scope:** Single NAS support only
- **License:** GPL-3.0

## Build & Development

```bash
npm install          # install dependencies
npm run build        # production build to dist/
npm run watch        # watch mode with sourcemaps
make devel-install   # build + symlink dist/ into ~/.local/share/cockpit/
make devel-uninstall # remove the symlink
```

The `cockpit` JS module is provided at runtime by the Cockpit frame — it is marked as external in esbuild and must not be bundled. Use `cockpit.spawn()` to shell out to CLI commands.

## Architecture

- `src/manifest.json` — registers "Plakar Backup" in Cockpit's Tools sidebar menu
- `src/index.html` / `src/index.tsx` — entry point, mounts React to `#app`
- `src/app.tsx` — main Application component (dashboard with store panels)
- `src/cockpit.d.ts` — TypeScript declarations for the `cockpit` module
- `build.js` — esbuild bundler config
- `dist/` — build output, symlinked into Cockpit for development
