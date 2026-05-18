# Specs Index

This directory contains product specifications, architecture decision records, and initiative documentation for the LearnEnglishApp.

For OpenSpec-style implementation change proposals, see [`openspec/changes/`](../openspec/changes/).

---

## Active Initiatives

| Initiative | Directory | Status | Summary |
|---|---|---|---|
| boards-tags-review-v2 | [boards-tags-review-v2/](boards-tags-review-v2/) | Planned | Boards, tags, advanced editing, review visibility, smart blocks |

---

## Architecture Decision Records

| ADR | Title | Status |
|---|---|---|
| [001](decisions/001-boards-not-folders.md) | Boards, not folders | Accepted |
| [002](decisions/002-tags-secondary-metadata.md) | Tags as secondary metadata | Accepted |
| [003](decisions/003-mobile-first-editing.md) | Mobile-first editing patterns | Accepted |

---

## Historical Specs (OpenSpec)

These specs live in `openspec/changes/` and represent the original MVP implementation. Listed here for cross-reference.

| Spec | Path | Status | Notes |
|---|---|---|---|
| User Auth | [openspec/changes/build-mvp-vocabulary-app/specs/user-auth/spec.md](../openspec/changes/build-mvp-vocabulary-app/specs/user-auth/spec.md) | Completed | JWT httpOnly cookie auth implemented |
| Word Search | [openspec/changes/build-mvp-vocabulary-app/specs/word-search/spec.md](../openspec/changes/build-mvp-vocabulary-app/specs/word-search/spec.md) | Completed | Merriam-Webster + Free Dictionary fallback implemented |
| User Vocabulary | [openspec/changes/build-mvp-vocabulary-app/specs/user-vocabulary/spec.md](../openspec/changes/build-mvp-vocabulary-app/specs/user-vocabulary/spec.md) | Completed | Per-meaning save implemented |
| SRS Review | [openspec/changes/build-mvp-vocabulary-app/specs/srs-review/spec.md](../openspec/changes/build-mvp-vocabulary-app/specs/srs-review/spec.md) | Completed | SM-2 algorithm implemented |
| Build MVP Vocabulary App (proposal) | [openspec/changes/build-mvp-vocabulary-app/proposal.md](../openspec/changes/build-mvp-vocabulary-app/proposal.md) | Completed | Original MVP scope and rationale |
| Build MVP Vocabulary App (design) | [openspec/changes/build-mvp-vocabulary-app/design.md](../openspec/changes/build-mvp-vocabulary-app/design.md) | Completed | Architecture decisions for MVP |
| Build MVP Vocabulary App (tasks) | [openspec/changes/build-mvp-vocabulary-app/tasks.md](../openspec/changes/build-mvp-vocabulary-app/tasks.md) | Completed | Implementation task breakdown |
| Vocabulary Discovery Refactor | [openspec/changes/vocabulary-discovery-refactor/spec.md](../openspec/changes/vocabulary-discovery-refactor/spec.md) | Partial | Large refactor spec — review against current implementation to confirm what was applied |

---

## Archive

Deprecated or superseded specs are moved to [`archive/`](archive/).

Currently empty.

---

## Conventions

- **Planned** — Spec exists, implementation not started.
- **In Progress** — Implementation actively underway.
- **Partial** — Implementation started but incomplete or spec partially outdated.
- **Completed** — Spec implemented and verified in production code.
- **Deprecated** — Superseded by a newer approach; retained for historical context.

---

## TODO

- [ ] Verify which parts of `vocabulary-discovery-refactor/spec.md` were actually implemented vs. remaining as future work. Update status accordingly.
- [ ] Confirm whether any additional feature work from `design.md` or `tasks.md` was deferred post-MVP.
- [ ] Establish a linking convention from openspec changes to this index once the workflow is standardised.
