.PHONY: package clean

package:
	@mkdir -p dist
	@rm -f dist/*.zip
	@zip -r dist/la-bonne-note.zip \
		manifest.json background.js content.js styles.css \
		popup.html popup.js icons/*.png -x "*.DS_Store"
	@echo "Created: dist/la-bonne-note.zip ($$(du -h dist/la-bonne-note.zip | cut -f1))"

clean:
	rm -rf dist
