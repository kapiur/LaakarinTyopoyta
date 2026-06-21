# AI Agent Reference

## Purpose

The AI agent is a supervised physician-facing assistant inside LaakarinTyopoyta.

It is designed to help with:

- drafting and polishing clinical text;
- translating clinical text between supported working languages;
- checking what should be verified in official sources;
- comparing guideline structures when enough evidence is available;
- assisting with templates, quick guides, and AI tool drafts.

It is not designed to be:

- an autonomous clinical decision-maker;
- a hidden background automation layer;
- an auto-save mechanism for user content;
- a source of patient-specific treatment recommendations without evidence.

The core product stance is that the agent must stay useful, honest, and operationally safe inside a real physician workflow.

## Current product surfaces

The same backend agent route powers several supervised surfaces:

- `/agent`
- template-related flows (`malli`)
- quick-guide drafting flows (`pikaohjeet-v2`)
- AI tool related drafting flows

The agent can suggest actions and produce drafts, but application of those drafts remains a separate explicit user action.

## Core design rules

These rules are architectural, not just prompt hints:

- no automatic save of drafts into user-facing content;
- no silent mutation of templates, quick guides, settings, or clinical records;
- privacy sanitization always runs before provider calls;
- audit logging stores metadata only, not raw patient text;
- high-risk clinical outputs require stronger evidence behavior;
- when evidence is incomplete, the agent must narrow the scope of what it claims.

## Contexts

The UI sends a `contextType` that describes what kind of work the user is doing. Current contexts are:

- `general`
- `clinicalReference`
- `clinicalResearch`
- `malli`
- `aiTool`
- `clinicalText`
- `pikaohje`

These contexts influence:

- task classification;
- prompt construction;
- evidence policy;
- draft style;
- suggested follow-up actions.

### Practical meaning of each context

#### `general`

Generic assistant behavior for non-clinical or mixed requests.

#### `clinicalReference`

Safe clinical reference mode. This is intended for:

- topic overviews;
- what to verify in official sources;
- checklist-style comparison of guideline sections;
- structured source checking without pretending unsupported precision.

#### `clinicalResearch`

Cross-country research and comparison mode.

This mode is intentionally separate from normal clinical reference behavior. Its purpose is educational and research-oriented comparison of official guidance across countries, not direct patient care advice.

Current connected countries:

- `FI`
- `RU`
- `DE`

The UI can explicitly select countries for comparison. If the user names unsupported countries, the backend must report that honestly instead of silently falling back to the default workspace country.

#### `malli`

Template drafting and polishing mode.

#### `aiTool`

AI tool design mode. The result is usually a prompt or a tool draft, not a clinical answer.

#### `clinicalText`

Clinical text transformation mode. This is the most common text-editing context for:

- shortening;
- language cleanup;
- translation;
- drafting a cleaner physician note from existing text.

#### `pikaohje`

Quick-guide drafting and review mode for the clinical card workflow.

## Task classification

The backend does not rely only on the UI context. It also classifies the request into a more specific task type using the planner.

Current task types include:

- `clinical_document`
- `clinical_review`
- `clinical_advice`
- `clinical_reference`
- `clinical_guideline_comparison`
- `clinical_source_check`
- `pikaohje_generation`
- `pikaohje_review`
- `medication_guidance`
- `urgent_triage`
- `referral_guidance`
- `text_fix`
- `translation`
- `template_generation`
- `template_polish`
- `tool_design`
- `lab_format`
- `general_chat`

The task type, not just the surface, decides:

- whether evidence is required;
- whether registry-only reference mode is acceptable;
- how strict the safety behavior must be;
- what kind of output contract is enforced.

### Important task-policy split

There are two broad classes of clinical behavior:

#### 1. Restricted reference or comparison tasks

Examples:

- `clinical_reference`
- `clinical_guideline_comparison`
- `clinical_source_check`

These tasks may be allowed to proceed in a constrained mode even when the system has only a registry of official sources and no strong retrieved excerpts. In that case the response must stay at the level of:

- what to compare;
- what sections to verify;
- which topics are safe to check manually;
- what cannot be asserted yet.

#### 2. Evidence-gated clinical advice tasks

Examples:

- `clinical_advice`
- `medication_guidance`
- `urgent_triage`
- `referral_guidance`

These tasks must not proceed with concrete clinical recommendations when evidence is missing or incomplete.

## End-to-end request lifecycle

The main backend flow lives in `/api/agent`.

At a high level:

1. the user opens an agent-enabled surface;
2. the UI sends the current context and current work material;
3. authentication is checked;
4. the request is privacy-sanitized;
5. the planner infers the task type and prompt contract;
6. user clinical evidence settings are loaded;
7. evidence retrieval runs when needed;
8. an evidence package is built;
9. the request may be blocked, constrained, or allowed;
10. the provider route and model are selected;
11. the model generates a draft;
12. output privacy and evidence consistency checks run;
13. the response and metadata are returned to the UI;
14. audit metadata is written.

## Privacy flow

Privacy protection is a first-class system layer.

### Input privacy

Before sending the request to an external model, the backend sanitizes:

- user message;
- current text;
- current template;
- prior conversation context.

Sanitization is mode-aware. Different logical input kinds map to different privacy modes, for example:

- clinical transformation text;
- persistent sample text;
- persistent stored instruction text;
- public source text;
- generic text.

The privacy layer returns:

- sanitized values;
- detected finding types;
- residual finding types;
- a decision severity;
- whether the request must be blocked.

If privacy rules require blocking, the agent returns a safe refusal and logs a privacy-related audit event.

### Output privacy

The generated answer is also checked before it is returned to the user.

If the output still contains blocked identifying content, the backend replaces the answer with a safe privacy warning instead of exposing the raw model output.

### Important boundary

The privacy system is intended to protect patient or third-party clinical text before AI processing. It is not meant to anonymize first-party account data stored in the system database such as the authenticated user record.

## Workspace and user personalization

The agent is not purely generic. It is shaped by user settings and workspace context.

### Workspace context

The backend builds a workspace context that includes:

- `practiceCountry`
- `clinicalCountry`
- `clinicalOutputLanguage`
- `evidenceStrictness`
- interface language

This context tells the model:

- what country the clinical framing should follow;
- what language the clinical output should use;
- how strict the evidence posture should be.

### User AI profile

The agent can also include the user AI profile when the task type allows it.

Depending on task type, profile usage may be:

- disabled;
- style-only;
- work-context-only;
- full.

For example:

- translation should not inherit broad stylistic drift;
- clinical reference tasks should lean on work context rather than free-form profile style;
- clinical document drafting can use richer user profile context.

### Provider and model routing

Provider choice is resolved through the AI routing layer and the user's settings.

The agent logic is separate from provider selection. The current architecture supports a broader provider layer while preserving the same safety and evidence checks before and after generation.

## Evidence pipeline

Evidence handling is the most important part of the clinical agent architecture.

### Evidence configuration

The backend loads the user's clinical evidence configuration, including:

- selected clinical country;
- output language;
- evidence strictness;
- allowed source set;
- whether official sources exist for that country;
- whether local or supplementary sources are allowed.

### Evidence statuses

The evidence package can currently be in one of these statuses:

- `found`
- `partial`
- `not_found`
- `not_required`

### Evidence levels

The package also describes evidence level, such as:

- `official_guideline`
- `official_reference`
- `local_instruction`
- `insufficient_evidence`
- `not_clinical`

### What `partial` means

`partial` is important and intentionally conservative.

Typical reasons:

- the country has official sources configured, but only the source registry is available;
- the topic exists in the country registry, but concrete excerpts were not retrieved;
- some but not all selected research countries have relevant evidence;
- the retrieved material is too weak for precise claims.

### Registry-only behavior

Some tasks are allowed to proceed when only registry-level evidence is available, but only in a restricted form. In that mode the answer may safely describe:

- which official sources matter;
- which headings to compare;
- what topics to check manually;
- where exact numbers or thresholds must be verified directly.

It must not present unsupported details as confirmed fact.

## Research mode

`clinicalResearch` is the current answer to the user's need for a more flexible, comparative, research-oriented workflow.

### Why this mode exists

Normal clinical reference mode is designed around the physician's active country context and patient-safe behavior.

Research mode exists for work such as:

- comparing official recommendations between countries;
- educational review of how frameworks differ;
- cross-country methodological study;
- preparation for research or professional development.

### Country selection rules

Research mode can work with explicitly selected countries from the UI.

If the user does not select countries, the backend can try to infer them from the request text.

Connected countries are currently:

- Finland (`FI`)
- Russia (`RU`)
- Germany (`DE`)

Unsupported countries must be reported as unsupported. The backend should not silently pretend to compare them.

### Evidence merge behavior in research mode

Evidence is collected country by country and then merged.

For comparison tasks:

- `found` means all selected supported countries have retrieved evidence;
- `partial` means only some countries have it, or coverage is incomplete;
- `not_required` means evidence was not required for the task class;
- `not_found` means the comparison cannot be grounded.

This is intentionally stricter than single-country reference mode because cross-country comparison becomes misleading very quickly if one side is grounded and another is not.

### What research mode is allowed to do

When evidence is incomplete, research mode can still help with:

- a safe comparison framework;
- manual comparison headings;
- explicit statement of which countries are connected;
- explicit statement of which countries currently lack retrieved topic excerpts.

### What research mode is not allowed to fake

Without country-specific excerpts, it must not invent:

- exact differences in thresholds;
- exact differences in drug choices or sequences;
- country-specific red flags as verified fact;
- cross-country conclusions that appear source-grounded but are not.

## Prompt construction and output contract

The planner builds a task-specific system instruction and user instruction. This is more than simple prompting: it is an output contract.

Examples of enforced behavior:

- clinical reference tasks without excerpts must stay checklist-oriented;
- translation tasks must preserve clinically relevant facts and negations;
- text editing tasks must not silently add new findings;
- responses should avoid noisy scaffolding like "task interpretation" and other internal process framing.

The current architecture specifically tries to reduce "AI-visible scaffolding" in user-facing answers.

## Translation behavior

Translation is treated as a distinct task with special constraints.

Current goals:

- preserve all clinically relevant content;
- preserve negation correctly;
- keep the result readable as a physician note;
- avoid unnecessary expansion or invention.

### Current practical limitations

The translation behavior is much better than earlier versions, but it still needs continued hardening around:

- negation preservation;
- avoiding accidental patient-role insertion;
- not converting anonymized placeholders into narrative assumptions;
- handling short compact vital-sign style text cleanly.

This remains an active area for future refinement.

## Suggested actions and draft handling

The agent can return structured suggested actions such as:

- `copy_draft`
- `use_as_template_draft`
- `open_template_editor`
- `use_as_ai_tool_prompt`
- `use_as_pikaohje_draft`
- `review_again`

These actions are intentionally lightweight.

Current product principle:

- the agent may prepare a next step;
- the user must still decide to apply it.

This is why draft application is UI-mediated and explicit instead of automatic.

## Evidence consistency and grounding retry

After generation, the backend can inspect whether the answer appears to claim more than the retrieved evidence supports.

If unsupported claims are detected on evidence-sensitive tasks, the system may:

- warn about unsupported claims;
- constrain the final answer;
- retry generation with stricter grounding instructions;
- block the answer entirely for high-risk task types.

This is one of the most important hardening layers because provider-level model quality alone is not enough for clinical safety.

## Audit logging

The agent writes metadata into `AiRunAuditLog`.

The goal is operational observability without sensitive content retention.

Logged fields include:

- user id;
- surface;
- task type;
- context type;
- provider;
- model;
- clinical country;
- evidence status;
- privacy finding types;
- whether the evidence gate blocked the request;
- latency;
- success or error code.

The agent must not write:

- raw patient text;
- full prompts;
- full answers;
- provider secrets or user API keys.

## Known limitations

The following limitations are current architectural realities, not bugs by themselves:

### 1. Topic coverage depends on retrieved excerpts

A country may have an official source registry and still not have a relevant topic excerpt currently retrieved for a given comparison.

### 2. Research mode is connected only for a limited country set

Current supported research-country set is:

- `FI`
- `RU`
- `DE`

Other countries may be mentioned by the user, but they are not yet connected through the current evidence layer.

### 3. Registry-only answers are deliberately conservative

This can feel restrictive, but it prevents the agent from presenting precise clinical claims without grounding.

### 4. Translation still needs continued edge-case hardening

Especially around:

- negations;
- short note fragments;
- placeholder handling after anonymization;
- brief symptom summaries where one wrong word flips meaning.

### 5. The agent is still not a full guideline browser

The architecture now has evidence retrieval and research mode, but it is still not the same as a full citation-rich guideline reading workspace with document navigation and section-level browsing.

## Recommended regression test areas

When revisiting agent behavior later, these are the most important regression groups to test:

### Clinical text transformation

- shorten without adding new facts;
- rewrite into a more physician-readable note;
- preserve negation;
- preserve laterality;
- preserve vitals;
- preserve anonymized placeholders.

### Translation

- RU -> FI medical note;
- FI -> RU medical note;
- no-shortening translation;
- no accidental insertion of patient name placeholders when none were present;
- no inversion of symptoms or negation.

### Clinical reference mode

- safe checklist output when only registry sources exist;
- refusal or strong constraint for exact thresholds without evidence;
- clear source-country reporting.

### Research mode

- explicit multi-country comparison with selected countries;
- unsupported-country honesty;
- no fake cross-country conclusions when excerpts exist only for one side;
- correct merged evidence status behavior.

### High-risk clinical advice requests

- exact dosing;
- urgent red flags;
- triage thresholds;
- referral criteria.

These should remain blocked or heavily constrained unless retrieved evidence supports them.

### Privacy behavior

- identifiable patient data in current text;
- placeholders after anonymization;
- capitalization after patient anchors;
- multilingual names and contact patterns;
- ensuring output does not reintroduce blocked identifiers.

## How to think about future development

The safest way to continue improving the agent is to keep the architecture layered:

1. privacy first;
2. task classification second;
3. evidence selection third;
4. model generation fourth;
5. consistency checks fifth;
6. explicit user application last.

If a future feature weakens one of those boundaries, it should be treated as a substantial architectural change, not a minor UX tweak.

## Likely next improvement themes

The next rounds of work will probably land in these areas:

- broader topic-aware retrieval coverage per country;
- better citation and excerpt visibility in the UI;
- more reliable multilingual translation of short clinical notes;
- expanded research mode country coverage;
- clearer structured display of grounded vs ungrounded comparison points;
- deeper agent-specific documentation for quick-guide and template workflows;
- more explicit user controls for switching between safe clinical mode and comparative research mode.

## Related documents

- [agent-architecture.md](agent-architecture.md)
- [agent-roadmap.md](agent-roadmap.md)
- [architecture.md](architecture.md)
- [privacy-architecture.md](privacy-architecture.md)
- [privacy-operations.md](privacy-operations.md)
