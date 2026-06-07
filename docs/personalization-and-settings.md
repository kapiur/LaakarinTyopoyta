# Personalization and Settings

## Product direction

LaakarinTyopoyta is being shaped into a personal physician desktop rather than a uniform portal.

That means:

- users should be able to decide which tools they see
- users should be able to control the order of those tools where it is practical
- country-specific defaults should provide a sensible starting point without trapping users in one configuration

Personalization should remain explicit and understandable. The system should prefer stored user preferences over hidden UI heuristics.

## Settings structure

The settings page is no longer one long vertical list.

[app/settings/page.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/settings/page.tsx) now organizes settings into second-level sections:

- workspace
- navigation and tools
- AI
- account
- admin for admin users

The active section is stored in `?section=...` so the page can be linked to a specific settings area.

## Practice country

The main top-level context for personalization is `practiceCountry`.

Related implementation:

- [components/PracticeCountrySettingsCard.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/components/PracticeCountrySettingsCard.tsx)
- [app/api/profile/workspace-context/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/profile/workspace-context/route.ts)
- [lib/clinical/practice/practiceCountryRegistry.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/clinical/practice/practiceCountryRegistry.ts)

Current supported practice-country defaults are centered around:

- `FI`
- `RU`

Practice country can apply recommended defaults for:

- interface language
- clinical country
- clinical output language
- evidence strictness
- default country-scoped clinical source preferences

Users can still override these values manually.

## Default vs override model

The settings UX now distinguishes between:

- values currently matching the practice-country default
- values manually overridden by the user

This is important because the system should feel predictable:

- the country sets the starting point
- the user keeps the final say

## Calculator personalization

The calculator area is the current reference implementation for explicit per-user tool personalization.

Key pieces:

- calculator registry:
  [lib/calculators/registry.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/calculators/registry.ts)
- catalog page:
  [app/calculators/page.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/calculators/page.tsx)
- settings card:
  [components/CalculatorVisibilitySettingsCard.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/components/CalculatorVisibilitySettingsCard.tsx)

Current behavior:

- users can enable or hide calculators
- users can change calculator order
- the catalog uses stored per-user preferences
- legacy calculator page has been removed

## Sidebar personalization

The main sidebar now supports per-user visibility and ordering for the primary navigation block.

Key files:

- [lib/navigation/sidebarRegistry.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/navigation/sidebarRegistry.ts)
- [app/api/sidebar/visibility/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/sidebar/visibility/route.ts)
- [components/Sidebar.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/components/Sidebar.tsx)
- [components/SidebarVisibilitySettingsCard.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/components/SidebarVisibilitySettingsCard.tsx)

Important boundary:

- only the main navigation area is personalized
- service controls such as settings and logout remain in the bottom service block

## Links and practice-country defaults

The links area now combines:

- practice-country default categories
- shared and personal categories already in the app

Key files:

- [lib/links/practiceCountryLinkRegistry.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/links/practiceCountryLinkRegistry.ts)
- [app/api/links/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/links/route.ts)
- [app/links/page.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/links/page.tsx)

Practice-country default link categories are intentionally treated as read-only defaults:

- they can be viewed
- they are localized
- they are not accidentally edited or deleted as personal content

## AI settings

The AI section in settings currently includes:

- AI profile and writing style configuration
- provider and credential settings
- quick access to the supervised AI agent

Related docs:

- [ai-providers-and-credentials.md](ai-providers-and-credentials.md)
- [privacy-architecture.md](privacy-architecture.md)

## Design rule for future personalization work

When adding new personalization features, prefer this order:

1. define a registry or explicit set of supported items
2. store per-user preferences explicitly
3. let practice-country defaults provide a starting point where appropriate
4. preserve manual user overrides
5. keep settings honest about what is default and what is custom

This keeps the physician desktop understandable instead of turning into a hidden rules engine.
