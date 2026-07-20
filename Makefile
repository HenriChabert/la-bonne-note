NAME    := la-bonne-note
VERSION := $(shell grep '"version"' manifest.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
OUTFILE := $(NAME)-v$(VERSION).zip

SOURCES := manifest.json background.js content.js styles.css popup.html popup.js \
           icons/icon16.png icons/icon48.png icons/icon128.png

.PHONY: package clean

package: $(OUTFILE)

$(OUTFILE): $(SOURCES)
	@rm -f $@
	@zip -r $@ $(SOURCES) -x "*.DS_Store"
	@echo "Created: $@ ($$(du -h $@ | cut -f1))"
	@echo "Upload at: https://chrome.google.com/webstore/devconsole"

clean:
	rm -f $(NAME)-v*.zip
