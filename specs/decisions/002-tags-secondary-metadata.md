# ADR 002: Tags as Secondary Metadata

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** Product, Engineering

---

## Context

Two organisational primitives are being introduced: boards and tags. It is necessary to define the intended role and UX weight of each so they remain distinct and complementary rather than overlapping and redundant.

This ADR defines the scope and constraints of tags.

---

## Decision

Tags are **lightweight, cross-cutting metadata** attached to cards. They are not a structural concept — they do not create navigation hierarchies, sections, or groupings in the primary UI. Tags are discoverable through filter surfaces and card detail views, but they do not dominate the application's navigational or visual architecture.

---

## Rationale

### 1. Boards and tags serve different cognitive purposes

Boards answer: *"What am I studying this word for?"*  
Tags answer: *"What is this word like?"*

A board is a curatorial intention — the user consciously places a word into a study context. A tag is descriptive metadata — it labels a property of the word itself, often one that applies across many boards.

Examples of board usage: "IELTS Writing", "Autumn 2025 course", "Academic essays".  
Examples of tag usage: `formal`, `noun`, `idiom`, `technical`, `informal`, `phrasal-verb`.

These are orthogonal dimensions. Conflating them into a single primitive creates confusion about what the user is organising and why.

### 2. Tags must not acquire structural weight

If tags become a primary navigation concept — appearing in the sidebar, driving routing, or serving as the primary filter surface — they stop being metadata and become a second folder system. This creates two competing organisational hierarchies, neither of which feels authoritative.

Tags must remain discoverable but secondary. They appear:
- On card detail views as small chips
- In the filter bar as checkboxes or multi-select
- In search/filter results

Tags do **not** appear as a top-level navigation item.

### 3. Tag assignment should be frictionless

Because tags are metadata, adding them should be lightweight. The interaction must not feel like filling in a form. Tag input should appear as an inline chip input in card detail or a quick-assign surface.

Over-complicating tag assignment (e.g., a dedicated tag management screen with descriptions, colours, icons by default) would signal to the user that tags are a heavyweight concept, which contradicts their intended role.

### 4. Tags are user-defined and user-scoped

Tags belong to a user, not a word or meaning. Different users may tag the same word differently. There is no global tag taxonomy. This keeps tags personal and relevant to each user's learning context.

### 5. The filtering strategy must support multi-tag intersection

When a user filters by multiple tags, the intent is almost always intersection ("show me cards that are both `formal` AND `phrasal-verb`"), not union. The filter implementation should default to AND logic between tags, while board + tag combination should also intersect (cards in board X that have tag Y).

---

## Consequences

### Positive

- Tags remain lightweight and learnable. New users are not overwhelmed by a two-level organisational system.
- Boards remain the primary organisational surface, maintaining a clear information hierarchy.
- Tags add cross-board filtering power without architectural complexity.
- The data model remains simple: a many-to-many `card_tags` join with a `tag` entity scoped to user.

### Negative

- Users who want richly structured taxonomies (colours, descriptions, parent tags) will find the tag system deliberately limited. This is an intentional constraint, not a gap.
- Without a dedicated tag management screen, tag cleanup (renaming, merging) requires an accessible but not prominent surface. This surface must be designed carefully so it is findable without being prominent.

### Neutral

- Tags are strings with no prescribed vocabulary. Typos and duplicates (e.g., `noun` vs `nouns`) are the user's responsibility unless autocomplete surfaces existing tags during input.

---

## Rejected Alternatives

**Tags as primary navigation (tag pages/routes):** Rejected. Creates a second navigation hierarchy that competes with boards and increases cognitive load.

**Global/shared tag taxonomy:** Rejected. Vocabulary learning is personal. A global taxonomy would impose categories that may not fit a user's learning goals and introduces moderation/management complexity.

**Tags with mandatory colours and icons:** Rejected as a requirement. Colour and icon support may be added as an optional future enhancement but must not be required for tag creation. The barrier to tagging must be as low as possible.

**Combining boards and tags into a single "collection" concept:** Rejected. The distinction in intention and UX behaviour between boards (curated study contexts) and tags (descriptive metadata) is valuable. Merging them erodes that distinction and forces the user to decide what kind of collection they're creating each time.
