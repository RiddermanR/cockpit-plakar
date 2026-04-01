PACKAGE_NAME := cockpit-plakar
PREFIX ?= /usr/local
DESTDIR ?=

all: build

node_modules: package.json
	npm install

build: node_modules
	npm run build

watch: node_modules
	npm run watch

devel-install: build
	mkdir -p ~/.local/share/cockpit
	ln -snf $(CURDIR)/dist ~/.local/share/cockpit/$(PACKAGE_NAME)

devel-uninstall:
	rm -f ~/.local/share/cockpit/$(PACKAGE_NAME)

install: build
	mkdir -p $(DESTDIR)$(PREFIX)/share/cockpit/$(PACKAGE_NAME)
	cp -r dist/* $(DESTDIR)$(PREFIX)/share/cockpit/$(PACKAGE_NAME)/

clean:
	rm -rf dist node_modules

.PHONY: all build watch devel-install devel-uninstall install clean
