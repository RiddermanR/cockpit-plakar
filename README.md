# cockpit-plakar

A [Cockpit](https://cockpit-project.org/) plugin for managing backups with
[Plakar](https://plakar.io/). It exposes the most common Plakar workflows —
inspecting snapshots, configuring stores and sources, restoring files, and
scheduling recurring backups — through a PatternFly-based UI inside Cockpit's
web console.

The plugin shells out to the `plakar` CLI for all backup operations and to
`systemd` for scheduling, so it does not run a daemon of its own.

## Features

- **Dashboard** — at-a-glance KPIs (stores, snapshot count, total size, last
  backup), per-store summary cards, snapshots-per-store and size-per-store
  bar charts, a list of scheduled backups with next/last run and result, and
  a "Recent snapshots" panel across all stores.
- **Snapshots** — one accordion item per store with a refresh button. Each
  store shows its most recent snapshots and lets you Check, Explore, or
  Restore individual snapshots (or files within them).
- **Schedule** — manage recurring backups (see "Scheduling" below).
- **Stores** — add, modify, and delete Plakar stores of type S3 or local.
  Persisted to `~/.config/cockpitplakar/stores.yaml` and synced into Plakar's
  own store registry via `plakar store import` / `plakar store set`. The
  local-store dialog has a built-in folder browser; secret fields support
  show/hide toggles. Optionally creates the store with `plakar at @<name>
  create`.
- **Sources** — add, modify, and delete backup sources. Persisted to
  `~/.config/cockpitplakar/sources.yaml` and synced via `plakar source add`
  / `plakar source set` / `plakar source rm`. Excludes are stored as a
  comma-separated list and additionally written one-per-line (gitignore
  format) to `~/.config/cockpitplakar/<source>-ignore.txt`, which the
  scheduled backup service then passes to Plakar via `-ignore-file`.

## Scheduling

Scheduling is **not** done with Plakar's built-in scheduler. Instead, the
plugin generates a pair of `systemd` units per scheduled backup:

```
/etc/systemd/system/plakar-<name>.timer
/etc/systemd/system/plakar-<name>.service
```

The timer holds one or more `OnCalendar=` lines (multiple schedules per
backup are supported, and each entry is validated live with
`systemd-analyze calendar`). The service runs as a configurable user and
calls something like:

```
/usr/bin/plakar at @<store> backup -ignore-file /home/<user>/.config/cockpitplakar/<source>-ignore.txt @<source>
```

From the Schedule tab you can add, modify, delete, enable/disable, and
trigger an ad-hoc run ("Backup now"). Triggering a run starts the systemd
service and streams its journal output into a modal window; closing the
window does not stop the running backup.

Writing unit files and running `systemctl` operations require administrator
privileges and Cockpit will prompt for them on demand.

## Configuration files

All plugin-managed configuration lives under `~/.config/cockpitplakar/`:

| File                              | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `stores.yaml`                     | Plakar store definitions managed by the UI    |
| `sources.yaml`                    | Plakar source definitions managed by the UI   |
| `<source>-ignore.txt`             | Per-source exclude patterns (gitignore style) |

The corresponding systemd units live in `/etc/systemd/system/plakar-*.{timer,service}`.

## Build & development

```bash
npm install          # install dependencies
npm run build        # production build to dist/
npm run watch        # watch mode with sourcemaps
make devel-install   # build and symlink dist/ into ~/.local/share/cockpit/
make devel-uninstall # remove the symlink
```

The `cockpit` JavaScript module is provided at runtime by the Cockpit frame
and is marked as external in the esbuild config — it must not be bundled.

## Packaging

An Arch Linux `PKGBUILD` is provided in `packaging/arch/`:

- `PKGBUILD` builds from a tagged GitHub release
  (`v$pkgver` tarball). Update `pkgver` and run `updpkgsums` after tagging.
- `PKGBUILD.local` builds straight from the current working tree, useful
  for local testing:

  ```bash
  makepkg -p packaging/arch/PKGBUILD.local -f
  ```

The resulting package installs the plugin into
`/usr/share/cockpit/cockpit-plakar/` and depends on `cockpit` and `plakar`
at runtime.

## Requirements

- Cockpit (web console)
- The `plakar` CLI in `PATH`
- `systemd` for scheduling
- Administrator privileges for managing schedules (writing unit files,
  enabling timers)

## License

GPL-3.0
