.PHONY: storybook storybook-build

storybook:
	test -d node_modules || npm ci
	npm run storybook -w @sphere/ui

storybook-build:
	test -d node_modules || npm ci
	npm run build-storybook -w @sphere/ui
