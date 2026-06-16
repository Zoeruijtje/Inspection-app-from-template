---
name: mvp-docs-sync
description: Use after every completed implementation phase to update the MVP factory documentation, progress log, decisions, TODO list, and next prompt.
---

# MVP Docs Sync Skill

Use this skill after every completed task or implementation phase.

## Required reading

Read:
- AGENTS.md
- docs/PROGRESS_LOG.md
- docs/DECISIONS.md
- docs/TODO.md
- docs/NEXT_PROMPT.md

## Update requirements

Update these files:

### docs/PROGRESS_LOG.md
Add:
- what was completed
- what changed
- checks run
- current status
- known issues

### docs/DECISIONS.md
Add decisions only if a real architectural/product choice was made.

### docs/TODO.md
Mark completed tasks and add newly discovered tasks.

### docs/NEXT_PROMPT.md
Write the next best prompt for Codex/DeepSeek.

## Rules

- Keep docs concise.
- Do not invent completed work.
- If checks were not run, say so.
- If something is uncertain, mark it as uncertain.
