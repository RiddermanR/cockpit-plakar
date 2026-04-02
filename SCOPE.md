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

## Features (Stage2)

Add Dashboard. For each store show a panel with a list of the backups. Order the list by the source. 

*Get stores:*
```
plakar store show
```
Get the storename from the top level of the yaml output. Remove the ':'

*Get backups*
```
plakar at @[storename] ls
```
Run for each store. the @ shoud be places before the storenames from the get stores command

## Features (Stage3)

Restore backup. From restore tab and dashboard
After clicking on the Restore button Open a modal dialog with te possibility to select a folder. Two buttons. Restore and Cancel. Restore spawns the restore command of plaker and shows the output on a card below the folder selection. After completion the buttons are replaced by a Close button

*Restore:*
```
plakar at @[storename] restore -to [destination] [backupid]
```

