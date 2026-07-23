---
description: Documentation checklist to keep all docs in sync after making changes to sites, providers, UI features, cache TTL, or version numbers.
---

# Skill: Maintain the codebase

After making changes to the extension, ensure all documentation stays in sync.

## Documentation checklist

Review and update the following files as needed:

### Core documentation

1. **`README.md`** — Main project documentation
   - Features list (all user-facing features)
   - Supported platforms list
   - Setup instructions (API keys, filters, enable/disable)
   - Architecture tree (entrypoints, lib, assets structure)
   - Badge states (rating, loading, disconnected, N/A, error)
   - How it works (content script flow)

2. **`CLAUDE.md`** — Agent instructions
   - Project conventions (sites, providers, registration)
   - Skill references
   - Development commands

### Chrome Web Store

3. **`store/description.txt`** — Chrome Web Store listing
   - Features list
   - Setup instructions with API key URLs
   - Link to full setup guide
   - **Do NOT list individual site/provider names** (Deliveroo, Netflix, etc.) — Chrome Web Store rejects this as keyword spam

4. **`store/privacy-policy.md`** — Privacy policy
   - Data usage table (what data, purpose, destination)
   - Third-party services table (service, URL, API key required)
   - Permissions table
   - Data retention (cache TTL)

### Provider documentation

5. **`docs/provider-setup.md`** — Detailed provider setup guide
   - Per-provider sections (API key steps, pricing, limitations)
   - Cache TTL references

### Agent skills

6. **`.claude/skills/add-site/SKILL.md`** — Guide for adding a new site
   - Step-by-step instructions
   - Documentation update checklist

7. **`.claude/skills/add-provider/SKILL.md`** — Guide for adding a new provider
   - Step-by-step instructions
   - Documentation update checklist

8. **`.claude/skills/maintain/SKILL.md`** — This file

### Extension manifest

9. **`wxt.config.ts`** — Manifest configuration
   - `description` field (mentions providers and platform categories)
   - `host_permissions` (all provider API domains)
   - `version` number

## What to check after common changes

### Added a new site
- `README.md`: supported platforms list, architecture tree
- `wxt.config.ts`: description (if new category)
- `entrypoints/content.ts`: matches array
- Do NOT add site names to `store/description.txt` (keyword spam rejection)

### Added a new provider
- `README.md`: features, setup instructions, architecture tree
- `store/description.txt`: features, setup instructions
- `store/privacy-policy.md`: data usage table, third-party services table
- `docs/provider-setup.md`: new provider section
- `wxt.config.ts`: description, host_permissions
- `entrypoints/options/main.ts`: setupInstructions (if API key needed)

### Changed a UI feature (popup, options, badges)
- `README.md`: features list, architecture description, badge states

### Changed cache TTL
- `README.md`: features list, architecture description
- `store/description.txt`: features list
- `store/privacy-policy.md`: data retention section
- `docs/provider-setup.md`: pricing/caching references

### Changed version
- `wxt.config.ts`: manifest version
- `package.json`: version field (keep in sync)
