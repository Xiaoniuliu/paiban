# P0 Canonical Execution Design

## Purpose

This spec defines the design for a `P0 canonical execution` layer that sits between:

- the source rule-classification document
- the live system's current rule behavior
- the future rule-engine implementation plan

It does **not** define the full rule-engine architecture.

It does **not** contain the first-pass rule-by-rule execution checklist itself.

Its job is to define how we decide which `P0` rules:

- are only catalog identities,
- are executable,
- are allowed to participate in current publish blocking,
- are pending because facts are missing,
- are pending because implementation is missing,
- or remain different due to an explicit business exception.

---

## Problem Statement

The project already has:

- a rule classification source in [PHASE3_RULE_ENGINE_CLASSIFICATION.md](/D:/paiban2/docs/archive/legacy-plans/PHASE3_RULE_ENGINE_CLASSIFICATION.md)
- a live system with some `P0` rules already active
- partial rule evaluation code in [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java)
- a rule center that exposes catalog identity, status, and recent hits

The missing piece is a stable decision layer that answers:

1. Which `P0` rules are currently part of the real publish-blocking loop?
2. Which `P0` rules are still only documented but not executable?
3. Which `P0` rules are blocked by missing facts rather than missing code?
4. Which system behaviors currently differ from the source classification, and why?

Without that layer, the project risks mixing together:

- rule importance,
- implementation readiness,
- single-rule trial capability,
- and actual publish-blocking ownership.

That would make the first rule-engine batch unstable and hard to review.

---

## Design Goal

The goal is to create one canonical execution model for `P0` rules before full engine expansion.

This model must let the team say, for every `P0` rule:

- what the source document says,
- what the system currently does,
- whether the rule is executable,
- whether it participates in the current publish-blocking loop,
- and what must happen next.

This creates the minimum trustworthy bridge from:

- rule catalog and classification

to:

- executable rule-engine batches.

---

## Non-Goals

This spec does not:

- implement new rule algorithms
- redefine the entire rule catalog model
- redesign the rule center UI beyond required state expression
- force every documented `P0` rule into the current publish flow
- make pending `P0` rules visible in publish results before they are executable
- replace the broader future rule-engine planning work

This is a canonicalization and gating design, not the full engine build.

---

## Source Of Truth

The default source of truth for `P0` rule identity and intended meaning is:

- [PHASE3_RULE_ENGINE_CLASSIFICATION.md](/D:/paiban2/docs/archive/legacy-plans/PHASE3_RULE_ENGINE_CLASSIFICATION.md)

The default comparison rule is:

- use the classification document as the baseline
- only preserve system behavior that differs from the document when there is a clear business exception

That means the canonical execution layer is not a passive copy of current code.

It is an explicit reconciliation layer.

---

## Core Principle

`P0 severity` and `execution readiness` are separate dimensions.

A rule may remain `P0` even if it is not yet executable.

Examples:

- `P0` + executable + in current publish blocking
- `P0` + executable + not yet used for publish blocking
- `P0` + pending facts
- `P0` + pending implementation
- `P0` + business exception

This separation is mandatory because some `P0` rules are business-critical but still not computable from current facts.

---

## Canonical Status Model

Each `P0` rule must have one execution readiness status:

- `已接入`
- `待补事实`
- `待实现`
- `业务例外`

Definitions:

- `已接入`
  The rule can be evaluated from current system facts and is already implemented at the intended scope.

- `待补事实`
  The intended rule is known, but current data inputs or derived facts are insufficient to evaluate it safely.

- `待实现`
  The intended rule and required facts are understood, but the evaluation logic is not yet implemented.

- `业务例外`
  The system intentionally differs from the default source-document interpretation, and that difference is retained for an explicit business reason.

This status is independent from whether the rule currently blocks publishing.

---

## Publish-Blocking Gate Model

Each `P0` rule must also carry a separate publish-loop flag:

- `是否进入当前发布阻断闭环 = 是`
- `是否进入当前发布阻断闭环 = 否`

Interpretation:

- `是`
  The rule is part of the current real publish-blocking loop.

- `否`
  The rule remains catalog-visible and important, but does not participate in current publish blocking.

This flag exists because:

- not every executable `P0` rule should immediately block publish
- not every `P0` rule is currently ready for execution

The project must avoid treating `can calculate` and `can block publish` as the same decision.

---

## Canonical Checklist Output

This spec requires a separate execution checklist document.

That checklist is the operational artifact for first-pass reconciliation.

It should be written as a separate file and should not be embedded inside this design spec.

The checklist must order rules in this sequence:

1. rules currently in the real publish-blocking loop
2. rules currently `ACTIVE` but not in the publish-blocking loop
3. rules documented as `P0` but not currently `ACTIVE` in the system

That ordering keeps the first review focused on the smallest real business loop.

---

## Required Checklist Fields

Each rule entry in the separate checklist must include:

- `Rule ID`
- `规则主题`
- `文档章节`
- `文档口径`
- `规则类型`
- `严重等级`
- `系统现状`
  - `目录状态`
  - `是否 ACTIVE`
  - `是否可计算`
  - `是否进发布阻断`
- `当前接入状态`
- `是否进入当前发布阻断闭环`
- `差异说明`
- `后续动作`

This is intentionally more descriptive than a narrow machine-state table.

The point is not just storage.

The point is to make reviewable reconciliation decisions.

---

## Presentation Rule

The canonical checklist should prefer readable per-rule sections instead of one very wide grid.

The main reason is that every mismatched rule may need non-trivial explanation.

A section-style entry is better than a giant spreadsheet-like markdown table for:

- business exception notes
- mismatch explanations
- implementation follow-up
- fact-gap explanations

The checklist is a review and planning artifact, not only a catalog export.

---

## UI / Product Implications

### Rule Center

The rule center should continue to preserve rule identity and severity.

For pending `P0` rules:

- the rule remains `P0`
- rule detail should clearly show `待实现` or `待补事实`
- single-rule calculation must be disabled

This allows the catalog to remain honest without pretending the rule is executable.

### Publish Results

Pending `P0` rules must **not** appear in publish results as blockers or special warnings.

Reason:

- some `P0` rules are not computable today
- publish results must reflect only the current real blocking loop
- the system should not imply that a pending rule was evaluated and passed

So the publish surface only reflects rules actually inside the current blocking loop.

---

## System Interface Contract

The canonical execution layer governs four downstream decisions.

### 1. Catalog identity

The catalog expresses:

- rule identity
- severity
- execution readiness status

But catalog presence alone does not imply executable behavior.

### 2. Single-rule calculation

Single-rule calculation is allowed only when:

- the rule is `已接入`
- and the rule is marked `是否可计算 = 是`

If not, the rule stays visible but calculation is unavailable.

### 3. Publish blocking

A rule may participate in real publish blocking only when:

- it is intended to be in the current blocking loop
- and its canonical checklist entry says `是否进入当前发布阻断闭环 = 是`

This decision must not be inferred only from severity.

### 4. Rule-engine batch selection

Future engine implementation batches should be selected from canonical checklist entries, not directly from the whole document universe.

Highest-priority future candidates are:

- `P0`
- not yet fully executable
- intended to enter the publish-blocking loop
- blocked by either missing facts or missing implementation

This makes the checklist the bridge from design truth to implementation order.

---

## Treatment Of Mismatches

Each rule reviewed in the checklist must end in one of three resolution outcomes:

- `文档与系统一致`
- `系统偏离文档，但有明确业务例外`
- `系统偏离文档，且后续按文档收敛`

This keeps review outcomes explicit.

It also avoids ambiguous middle states where no one knows whether current behavior is intentional.

---

## Relation To Future Rule-Engine Work

This spec is the front door to later rule-engine planning, not a replacement for it.

After the checklist exists, the next planning layer can safely ask:

- which facts must be added first
- which calculation methods must be implemented first
- which executable `P0` rules should enter the next batch
- which current system gates should remain operational rather than becoming regulation-evaluation rules

That later implementation planning should follow from the canonical checklist, not bypass it.

---

## Success Criteria

This design is successful when:

1. every `P0` rule can be given a canonical execution status
2. every `P0` rule has an explicit current publish-loop flag
3. the team can explain system-vs-document differences without ambiguity
4. pending `P0` rules remain visible in the catalog without polluting publish results
5. later rule-engine batches can be chosen directly from the checklist

---

## Immediate Next Artifact

The next artifact after this spec is a separate operational checklist file for first-pass `P0` reconciliation.

That checklist should:

- start with currently publish-blocking `P0` rules
- compare live system behavior against the source classification document
- classify each mismatch as fact gap, implementation gap, or business exception

That checklist, not this spec, is where the first real rule-by-rule reconciliation happens.
