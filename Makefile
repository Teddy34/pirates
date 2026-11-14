.PHONY: help serve serve-test syntax test test-browser check

help:
	@echo "make serve         Start the game on port 8000"
	@echo "make serve-test    Start the game on isolated port 8011"
	@echo "make syntax        Check JavaScript syntax"
	@echo "make test          Run syntax and deterministic tests"
	@echo "make test-browser  Run the transfer-window, landing, retirement, villain, vignette, sword-fight, sea-chart, fort-battle, romance, save-slot and health smoke tests"
	@echo "make check         Run every automated check"

serve:
	node server.js

serve-test:
	PORT=8011 HOST=127.0.0.1 node server.js

syntax:
	@for file in src/*.mjs tools/*.mjs server.js; do echo "node --check $$file"; node --check "$$file" || exit 1; done

test: syntax
	node --test

test-browser:
	node tools/check_plunder_hold.mjs
	node tools/check_landing.mjs
	node tools/check_retirement.mjs
	node tools/check_villains.mjs
	node tools/check_vignettes.mjs
	node tools/check_sword_fights.mjs
	node tools/check_sea_chart.mjs
	node tools/check_fort_battle.mjs
	node tools/check_romance.mjs
	node tools/check_saves.mjs
	node tools/check_health.mjs

check: test test-browser
	git diff --check
