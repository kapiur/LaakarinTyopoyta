# Agent Architecture

## Purpose

The AI agent is not meant to be an autonomous clinical actor. It is a supervised drafting and review assistant inside a physician workflow.

This document is the short architectural overview. The detailed operational reference is in [agent-reference.md](agent-reference.md).

Its job is to:

- analyze current work context
- produce drafts
- suggest next actions
- remain clinically cautious
- never save or mutate data automatically

## Core principles

- no auto-save
- no silent database writes
- no patient-specific clinical recommendations without evidence
- no hidden persistence of sensitive conversation content
- explicit user confirmation before applying clinically relevant edits

## Context model

Current agent contexts:

- `general`
- `clinicalReference`
- `clinicalResearch`
- `clinicalText`
- `malli`
- `aiTool`
- `pikaohje`

These contexts influence:

- task classification
- system prompt construction
- evidence policy
- suggested actions

## Task model

The planner maps requests into task types such as:

- `general_chat`
- `template_generation`
- `template_polish`
- `tool_design`
- `clinical_reference`
- `clinical_guideline_comparison`
- `clinical_review`
- `clinical_advice`
- `medication_guidance`
- `urgent_triage`
- `referral_guidance`
- `pikaohje_generation`
- `pikaohje_review`

Task type decides whether evidence is required and what response style is allowed.

## Clinical safety model

### 1. Reference mode

Safe reference questions are allowed in limited form.

Examples:

- guideline comparison
- overview of a topic
- what sections should be compared
- what should be checked in official sources

Without retrieved evidence excerpts, the agent must not confidently state:

- exact country differences
- target values
- dosages
- treatment durations
- referral thresholds
- contraindications
- red flags as verified fact

### 2. Advice mode

Advice-like requests require stronger evidence behavior.

Examples:

- treatment recommendations
- medication dosing
- urgent triage
- referral guidance
- patient-specific instructions

If evidence is missing or partial, the backend must block these requests.

## Evidence pipeline

Current evidence flow:

1. user request enters `/api/agent`
2. inputs pass through privacy sanitization
3. planner classifies the task
4. clinical source settings are loaded for the user
5. retrieval attempts to collect evidence
6. evidence package is built
7. blocked tasks are stopped before model generation
8. allowed tasks run through routed completion
9. a post-check flags unsupported claims

Current retrieval sources include:

- configured official source registry
- user-provided source excerpts
- allowed-domain URL retrieval

## Audit logging

The agent writes metadata to `AiRunAuditLog`.

Logged:

- user id
- surface
- task type
- context type
- provider
- model
- clinical country
- evidence status
- privacy finding types
- blocked-by-evidence-gate
- latency
- success / error code

Not logged:

- raw patient text
- full prompt
- full AI response
- API keys

## Current integrations

Implemented:

- `/agent`
- `/malli`
- `/pikaohjeet-v2/clinical-manager`

Recent behavior:

- `Pikaohje agent` can update the editor draft
- draft application is still manual and editor-only
- actual database save remains a separate explicit user action

## Near-term roadmap

The active roadmap is in [agent-roadmap.md](agent-roadmap.md).

Practical next steps likely include:

- broader `pikaohjeet-v2` integration
- deeper evidence consistency behavior
- better source visibility in UI
- more complete provider abstraction cleanup

For the current detailed behavior, evidence states, research mode semantics, and testing guidance, see [agent-reference.md](agent-reference.md).
