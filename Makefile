.PHONY: package clean

VERSION := $(shell grep '"version"' manifest.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')

package:
	@mkdir -p dist
	@rm -f dist/*.zip
	@zip -r dist/la-bonne-note-v$(VERSION).zip \
		manifest.json background.js content.js styles.css \
		popup.html popup.js icons/*.png -x "*.DS_Store"
	@echo "Created: dist/la-bonne-note-v$(VERSION).zip ($$(du -h dist/la-bonne-note-v$(VERSION).zip | cut -f1))"

clean:
	rm -rf dist
