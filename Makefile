.PHONY: dev build package clean

dev:
	bun run dev

build:
	bun run build

package:
	bun run zip

clean:
	rm -rf .output .wxt dist
