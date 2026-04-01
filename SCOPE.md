## Problem

For making backups from my NAS I'm using plakar. This works great but only on CLI.

## Solution

 use Cockpit to monitor my system. I want to build a new module for Cockpit that can manage the plakar backups using the PatternFly/React-based Cockpit plugin framework. The module shells out to the plakar CLI and displays the results in Cockpit panels. 


## Architecture

- **Framework:** PatternFly/React Cockpit plugin
- **Backend:** Shell out to plakat CLI, capture and display output
- **Config location:** `~./config/cockpit-plakar/`
- **Single NAS** support only

## Features (Stage1)

In the first stage I only want to add Plakar Backup to the Cockpit main menu displaying Dashboard on the screen. Outside that no functionality at all.
