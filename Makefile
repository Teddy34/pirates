.PHONY: help serve serve-test syntax test test-browser check

help:
	@echo "make serve         Start the game on port 8000"
	@echo "make serve-test    Start the game on isolated port 8011"
	@echo "make syntax        Check JavaScript syntax"
	@echo "make test          Run syntax and deterministic tests"
	@echo "make test-browser  Run the plunder and merchant interaction smoke test"
	@echo "make check         Run every automated check"

serve:
	node server.js

serve-test:
	PORT=8011 HOST=127.0.0.1 node server.js

syntax:
	node --check src/game.mjs
	node --check src/mechanics.mjs
	node --check src/world-map.mjs
	node --check src/terrain.mjs
	node --check src/terrain-worker.mjs
	node --check src/town-sprites.mjs
	node --check server.js
	node --check tools/build_scenarios.mjs
	node --check tools/check_plunder_hold.mjs

test: syntax
	node --test

test-browser:
	node tools/check_plunder_hold.mjs

check: test test-browser
	git diff --check
