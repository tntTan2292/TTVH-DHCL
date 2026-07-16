# PO Review Template

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Required Fields](#2-required-fields)
- [3. PO Checklist](#3-po-checklist)
- [4. PO Result](#4-po-result)
- [5. Linked Findings](#5-linked-findings)
- [6. Recovery Ticket](#6-recovery-ticket)
- [7. Closure Evidence](#7-closure-evidence)

## 1. Purpose

This template standardizes Product Owner review evidence for user-visible development tickets.

## 2. Required Fields

- Affected Module
- Affected Screen / Menu
- Route / URL
- Required Test Context
- What Changed
- Expected Result
- Business Result
- PO Check Steps
- Known Warnings
- Blocking Rule
- PO Response Required

## 3. PO Checklist

- [ ] Navigation works
- [ ] Correct context is preserved
- [ ] Correct runtime data is displayed
- [ ] UI order and labels are understandable
- [ ] Loading state works
- [ ] Empty state works
- [ ] Error state works
- [ ] No shell/demo/placeholder content remains
- [ ] Business behavior matches the expected result
- [ ] The feature is usable for the intended decision or operation

## 4. PO Result

Use exactly one:

- `PASS`
- `WARNING`
- `FAIL`

## 5. Linked Findings

If PO reports an issue, include:

- PO Finding ID
- Classification
- Responsible ticket
- Blocking status
- Recheck point

## 6. Recovery Ticket

If the finding is a defect or incomplete scope item, link the recovery or fix ticket that owns the correction.

## 7. Closure Evidence

Closure must reference:

- the fix ticket or planned ticket
- runtime evidence
- PO recheck location
- final PO result

