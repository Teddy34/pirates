# Origin

A plain copy (not an installed skill) of `skills/sprite-stacking` from
https://github.com/danielwh2/sprite-stacking at commit 6fecdfd
(2026-11-21), by Daniel White, under the MIT licence in `LICENSE`. The files
are unchanged. The upstream test suite (`tests/check.py`) and media are not
copied.

RetroPirates! uses it in `tools/build_ship_stacks.py`, which imports
`scripts/views_to_slices.py` to carve the ships' code-drawn views into
slices. Agents read `SKILL.md` as a plain document.
