# Task 008: Implement Bottleneck identification: which job takes the longest on average

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

Design and implement the capability for: Bottleneck identification: which job takes the longest on average.

## Problem

The product cannot satisfy its initial scope until Bottleneck identification: which job takes the longest on average exists as a reviewable, testable capability.

## Solution

Add a focused module for Bottleneck identification: which job takes the longest on average that matches the recommended modular monolith and keeps integration boundaries explicit.

## Files To Create Or Modify

- src/modules/bottleneck-identification-which-job-take/index.ts
- src/modules/bottleneck-identification-which-job-take/bottleneck-identification-which-job-take.service.ts
- src/modules/bottleneck-identification-which-job-take/bottleneck-identification-which-job-take.repository.ts
- tests/integration/bottleneck-identification-which-job-take.test.js

## Acceptance Criteria

- [ ] The Bottleneck identification: which job takes the longest on average capability is available through the intended application surface.
- [ ] Core validation, error handling, and persistence for Bottleneck identification: which job takes the longest on average are covered by tests.

## Implementation Notes

- Start from domain rules and access constraints before UI or transport details.
- Keep module boundaries explicit so later extraction remains possible if the system grows.
- Update docs and tests in the same change instead of leaving them for cleanup.
