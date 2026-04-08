# Task 009: Implement Per-repo and cross-repo aggregated view

## Category

feature

## Priority

P1

## Wave

wave-3

## Delivery Phase

implementation

## Depends On

- 001
- 002

## Blocks

- 011

## Summary

Design and implement the capability for: Per-repo and cross-repo aggregated view.

## Problem

The product cannot satisfy its initial scope until Per-repo and cross-repo aggregated view exists as a reviewable, testable capability.

## Solution

Add a focused module for Per-repo and cross-repo aggregated view that matches the recommended modular monolith and keeps integration boundaries explicit.

## Files To Create Or Modify

- src/modules/per-repo-and-cross-repo-aggregated-view/index.ts
- src/modules/per-repo-and-cross-repo-aggregated-view/per-repo-and-cross-repo-aggregated-view.service.ts
- src/modules/per-repo-and-cross-repo-aggregated-view/per-repo-and-cross-repo-aggregated-view.repository.ts
- tests/integration/per-repo-and-cross-repo-aggregated-view.test.js

## Acceptance Criteria

- [ ] The Per-repo and cross-repo aggregated view capability is available through the intended application surface.
- [ ] Core validation, error handling, and persistence for Per-repo and cross-repo aggregated view are covered by tests.

## Implementation Notes

- Start from domain rules and access constraints before UI or transport details.
- Keep module boundaries explicit so later extraction remains possible if the system grows.
- Update docs and tests in the same change instead of leaving them for cleanup.
