# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

cockpit-plakar is a Cockpit plugin for managing Plakar backups on a NAS. It shells out to the `plakar` CLI and displays results in Cockpit panels.

- **Framework:** PatternFly/React Cockpit plugin
- **Backend approach:** Shell out to `plakar` CLI, capture and display output
- **Config location:** `~/.config/cockpit-plakar/`
- **Scope:** Single NAS support only
- **License:** GPL-3.0

## Current State

The project is in early development (Stage 1). The initial goal is adding a "Plakar Backup" entry to the Cockpit main menu that displays a dashboard, with no other functionality yet.
