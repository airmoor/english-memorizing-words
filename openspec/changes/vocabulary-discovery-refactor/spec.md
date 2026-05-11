# Vocabulary Discovery & Navigation Refactor

**Status:** Proposal — not yet implemented  
**Scope:** Search page · Vocabulary page · shared word detail experience  
**Review page:** Preserved as-is (see §12)  
**Last revised:** Implementation-critical additions — data ownership, loading architecture, hook modularity, URL sync, virtualization constraints, accessibility, motion philosophy, composition model, navigation philosophy

---

## 1. Problem Statement

The app currently has three isolated surfaces that share no navigation context:

```
Search ──────────────────────────────────────────── dead end
Vocabulary ──────────────────────────────────────── dead end
Review ───────────────────────────────────────────── isolated loop
```

### Concrete gaps

**Search feels like a lookup tool, not a learning surface.**
You type, you get a result, you optionally save it. There is no signal that a word is already in your vocabulary until after you search. There is no path from "I found this word" to "I want to study this word."

**Vocabulary is a receipt, not a workspace.**
Saved words show a compressed preview — first 3 meanings, a permanently-visible remove button. You cannot open the full dictionary entry. There is no way to search or filter your own collection. As vocabulary grows past 30–50 words the page becomes unwieldy: every row carries identical visual weight, no hierarchy helps you navigate, and learning state is completely invisible.

**There is no canonical word page.**
`WordEntry` exists only inside Search. It cannot be reached from Vocabulary. The full dictionary data is fetched once and then trapped inside a single stateful page. This is the most consequential structural gap — every other problem flows from it.

**The three mental models have no connective tissue.**
A user who saves a word from Search has no easy path to review its full definition before a session, no confirmation that the word entered their review queue, and no way to see how well they know it. The learning loop is implicit and invisible.

---

## 2. Mental Model Shift

### Current (implicit) model
```
Search     = dictionary lookup
Vocabulary = saved list
Review     = flashcard trainer
```
Three separate tools loosely connected by data.

### Target model
```
Search     = explore the global language space
Vocabulary = personal word library (living workspace)
Review     = focused training mode (pulls from library)
```

A user **discovers** words through Search, **curates** them in Vocabulary, and **internalizes** them through Review. The word itself — as a rich knowledge object — must be accessible from all three contexts without abandoning the current surface.

The connective tissue is a **shared canonical word detail view** that can be opened from any surface as a contextual overlay, adapting its container to the device and screen context.

---

## 3. Foundational Principle: Contextual Focus, Not Page Navigation

> Opening word detail is contextual focus, not full page navigation.

This is the interaction philosophy from which every other decision in this spec follows. It must be stated explicitly because it runs counter to the default SPA pattern of "navigate to a detail page, press back to return."

### What this means

When a user opens a word, they are **focusing their attention** on one item from a collection. The collection does not go away. The user's position in that collection does not reset. They are not "going somewhere" — they are zooming in while the context stays intact.

This pattern appears in every well-designed knowledge tool:
- Selecting an email in a mail client — the inbox remains visible
- Opening a file in a code editor — the file tree remains visible
- Selecting an issue in Linear — the issue list remains visible and scrollable
- Opening a note in Notion — the sidebar hierarchy remains present

The detail is an **inspector**, not a **destination**.

### What this principle explains

Every architectural decision below is a consequence of this principle:

| Decision | Why |
|----------|-----|
| SidePanel pushes the list rather than replacing it | The list is still the context |
| BottomSheet keeps the list visible behind it | Context preserved on mobile |
| Active row is highlighted while detail is open | The connection between list and detail is explicit |
| ‹ › navigation does not require closing the container | You are browsing a collection, not navigating pages |
| List scroll position is always preserved | You are focused on one item, not navigating away |
| URL param (`?word=`) rather than full route change for in-context browsing | Focus, not navigation |
| Escape/close returns focus to the triggering row | You return to exactly where you were |

### What this principle prevents

- Building the detail as a separate route and navigating to it from the list
- Replacing the list with the detail view on mobile (a common but destructive pattern)
- Using a modal that covers the list (a popup is not an inspector)
- Losing list scroll position on open/close
- Making the detail panel feel like a separate "page" through dramatic transitions

---

## 4. Architecture Principle: Dictionary Data vs. Learning Objects

This is a foundational distinction that must be explicit in the codebase, the UI, and every future design decision.

### 4.1 Two separate domains

```
Dictionary domain        ─────  shared, immutable, global
─────────────────────────────────────────────────────────
Word                     the text itself ("ephemeral")
Meaning                  dictionary senses, definitions, examples
Transcription            phonetic form
Provider                 Merriam-Webster or Free Dictionary

Learning domain          ─────  private, mutable, user-scoped
─────────────────────────────────────────────────────────
UserWord                 the user's decision to study this word
Card                     SRS state: ease, interval, next review date
ReviewLog                history of every rating event
(future) CardNote        user's personal annotation on a word
(future) CardMeaning     user's selection of relevant senses
```

### 4.2 Why this matters right now

A "saved vocabulary entry" is not simply a dictionary entry with a bookmark. It is the intersection of three things:

1. **The dictionary entry** — shared, read-only data that any user can fetch
2. **The ownership record** (`UserWord`) — "I decided to study this word"
3. **The learning state** (`Card`) — "here is how well I currently know it"

The UI must honor this separation. `WordDetailContent` presents the **dictionary layer**. The review status block at the bottom of the detail view presents the **learning layer**. These are visually and conceptually distinct — not one fused "word card."

### 4.3 Future extensibility that depends on this separation

The following product features are all plausible near-term additions. Every one of them belongs to the learning domain (Card / CardNote / CardMeaning) and must never mutate the shared dictionary data:

- **Relevant meaning selection** — the user hides senses they consider irrelevant to their learning goal
- **Personal notes** — a freeform annotation attached to the user's word, not to the dictionary definition
- **Mnemonics** — a memorable image or story for this word, private to the user
- **Custom examples** — the user's own example sentences alongside the dictionary examples
- **AI explanations** — a generated explanation tuned to the user's level, stored on the card
- **Personal difficulty rating** — separate from SM-2 ease; the user's subjective sense of difficulty
- **Learning tags** — private categorization ("business English", "GRE prep", "encountered in reading")

None of these are dictionary edits. They are learning annotations that live on user-owned entities. Building the UI so that `WordDetailContent` (dictionary) and the learning status section (Card) are clearly separate components from day one makes all of the above trivially addable as new sections.

### 4.4 The principle, stated plainly

> `WordDetailContent` is the canonical dictionary layer.  
> Learning state belongs to user-owned card entities.  
> These two layers are displayed together in the detail view, but they are never merged.

`WordDetailContent` may **compose** dictionary payloads and user learning payloads, but must **never directly mutate dictionary entities**.

### 4.5 Data ownership rules

This subsection defines the operational rules that enforce the architecture boundary at implementation level.

#### Caching expectations

Dictionary data and learning data use entirely separate React Query cache namespaces:

```
Dictionary cache key:   ['word', wordId]
                        Long stale time (5–30 minutes)
                        Shared across all users
                        Never invalidated by user actions

Learning cache keys:    ['vocabulary']           — full user vocabulary list
                        ['progress']             — review session state
                        ['card', cardId]         — individual card state (if needed)
                        Short stale time (30 seconds to 2 minutes)
                        User-scoped; invalidated by save/remove/review actions
```

These caches are never shared, never merged, never aliased. No convenience key that returns a combined payload should be created.

#### Mutation ownership

| Entity | Who mutates it | Cache invalidated |
|--------|---------------|-------------------|
| `Word` / `Meaning` | Backend only (on first provider fetch) | Never invalidated from frontend |
| `UserWord` | `VocabularyService.saveWord` / `removeWord` | `['vocabulary']` only |
| `Card` | Created by `saveWord`; updated by `reviewCard` | `['vocabulary']`, `['progress']` |
| `ReviewLog` | Created by `reviewCard` | `['progress']` only |

Removing a word from vocabulary invalidates `['vocabulary']` but **never** invalidates `['word', wordId]`. The dictionary data persists in the global cache. If the user searches for the same word again, it loads from cache, not from a new API call.

#### Composition boundaries

`WordDetailContent` receives two explicitly typed, independent props:

```typescript
interface WordDetailContentProps {
  word: WordPayload           // dictionary layer: id, text, transcription, provider, meanings
  learningState?: LearningState  // learning layer: null when word is not saved
  onSave:   () => void
  onRemove: () => void
}

interface WordPayload {
  id: string
  text: string
  transcription: string | null
  provider: DictionaryProvider
  meanings: MeaningPayload[]
}

interface LearningState {
  nextReview: Date
  lastReviewedAt: Date | null
  intervalDays: number
  easeFactor: number
}
```

`WordDetailContent` never derives learning state from the word payload. It never reads the vocabulary cache directly. It receives what it needs and renders it.

#### Synchronization expectations

```
User saves a word:
  → POST /vocabulary/words/:id
  → Invalidate ['vocabulary']
  → ['word', wordId] untouched

User removes a word:
  → DELETE /vocabulary/words/:id
  → Invalidate ['vocabulary']
  → ['word', wordId] untouched — still in dictionary cache

User reviews a card:
  → POST /reviews/:cardId
  → Invalidate ['progress'], ['vocabulary']
  → ['word', wordId] untouched

Detail panel opens (vocabulary context):
  → No new fetch required — vocabulary payload is sufficient
  → Optional background refresh of ['word', wordId] for newest senses (silent)

Detail panel opens (search context):
  → NormalizedWord payload already in-memory — no fetch
  → LearningState derived from ['vocabulary'] cache by wordText match
```

#### Preventing architectural drift

The following patterns must be explicitly rejected to prevent dictionary and learning data from accidentally merging over time:

- **No combined DTO** at the API layer that returns `{ word, card }` in one response
- **No mutation of `Word.meanings` to store user preferences** — user meaning selection belongs to `CardMeaning`
- **No "save count" or "learning signal" field on the `Word` entity** — these are aggregations of `Card` data
- **TypeScript interface separation**: `WordPayload` and `LearningState` must remain distinct types at every layer boundary

---

## 5. Adaptive Detail Experience

The word detail view is the connective tissue of the whole system. It must be available from Search, Vocabulary, and eventually Review — invoked without destroying the caller's context.

The container that wraps the detail content adapts to the device and interaction context. The content inside never changes.

### 5.1 Mobile: BottomSheet

On touch-primary devices, the detail opens as a **bottom sheet** that slides up over the current page.

```
┌─────────────────────────────────┐
│  (vocabulary list, dimmed)       │
│                                  │
│  ──────── [drag handle] ───────  │◄── pull to dismiss
│                                  │
│  ephemeral        [Saved ✓]      │
│  /ɪˈfɛmərəl/                    │
│  merriam-webster                 │
│  ──────────────────────────────  │
│  adjective                       │
│    1  lasting a very short time  │
│       …                          │
│  ──────────────────────────────  │
│  ‹ previous          next ›      │◄── word navigation
└─────────────────────────────────┘
```

**Behavior:**
- Default snap point: ~70% screen height (comfortable reading, thumb-reachable actions)
- Full expand: 95% — full dictionary entry for long words
- Dismiss: drag down below 30% or tap the backdrop
- The vocabulary list behind is dimmed but visible — context is preserved
- Navigation arrows (‹ ›) allow moving to the previous/next word in the source list without closing the sheet

**Why not a full-screen navigation push on mobile:**
Navigating away to a detail page means "back" goes to the list, which is correct but breaks flow when browsing multiple words in quick succession. A sheet allows rapid browsing — the list is one tap away at all times. This is the contextual focus principle (§3) applied to mobile.

### 5.2 Desktop: SidePanel

On pointer-primary devices at ≥ 1024px viewport width, the detail opens as a **right-side inspector panel** — the list narrows, the panel slides in from the right edge.

```
┌──────────────────────────┬──────────────────────────┐
│  Vocabulary              │  ephemeral         [×]   │
│  ──────────────────────  │  /ɪˈfɛmərəl/            │
│  ● ephemeral    ◄active  │  merriam-webster         │
│  ephemeron               │  ─────────────────────── │
│  ephemeris               │  adjective               │
│  epoch                   │    1  lasting a very     │
│  equivocal               │       short time         │
│  erudite                 │       "his fame proved   │
│  …                       │       ephemeral"         │
│                          │  ─────────────────────── │
│                          │  Review status           │
│                          │  Next review: tomorrow   │
└──────────────────────────┴──────────────────────────┘
```

**Behavior:**
- Panel width: fixed 380px. The list column shrinks to fill the remainder.
- The list remains fully scrollable — users can browse the list while the panel is open
- Clicking a different row transitions the panel content in place (no close/reopen)
- The active row is highlighted in the list (left accent bar + subtle background tint)
- Panel is dismissed with `×` or `Escape`
- Keyboard: `↑`/`↓` arrows navigate between words while focus is in the panel
- The panel is non-destructive — the list scroll position is always preserved

**Why not a modal on desktop:**
A modal covers the list entirely — defeating the purpose of contextual browsing. The panel pattern (Linear, Notion side peek, VS Code detail panels) keeps both the list and the detail visible simultaneously, enabling a knowledge browsing mode that modals fundamentally cannot support.

**Why the panel pushes the list rather than overlaying it:**
An overlay panel introduces a z-index layer that visually severs the connection between the active row and the panel content. Pushing the layout treats both the list and the panel as co-equal parts of the same view — they feel like two halves of the same surface, not a popup floating over a background.

### 5.3 Breakpoint and detection strategy

```
Pointer detection:   @media (pointer: coarse)  → BottomSheet
                     @media (pointer: fine)    → SidePanel (if viewport ≥ 1024px)
Viewport fallback:   < 1024px                  → BottomSheet regardless
                     ≥ 1024px + fine pointer   → SidePanel
```

Pointer media queries correctly handle: iPad with keyboard/mouse (fine pointer → SidePanel), phone (coarse → BottomSheet), laptop touchscreen (fine pointer usually wins at ≥ 1024px).

### 5.4 Component architecture

```
WordDetailContainer          ← responsive wrapper + useWordDetail surface
  ├── (mobile / touch)  →  BottomSheet
  │                              └── WordDetailContent
  └── (desktop / pointer) →  SidePanel
                                    └── WordDetailContent
```

`WordDetailContent` is section-composed — not a monolithic render tree. See §15 for the full composition model.

---

## 6. Loading & Transition Architecture

The spec above defines the happy-path UX. This section defines loading behavior and transition strategy, which are equally part of the premium experience.

### 6.1 Opening from vocabulary context

The `VocabularyWord` payload returned by `GET /vocabulary` includes `wordId`, `wordText`, `transcription`, `meanings[]`, `savedAt`, `nextReview`, and `lastReviewedAt`. This is sufficient to render `WordDetailContent` completely — no secondary fetch is required.

**Result: the panel opens instantly, with zero loading state, in ≥ 95% of user interactions.**

Background refresh is allowed but must be silent: after opening, the detail may trigger a background `GET /api/words/:id` to pick up any new dictionary senses added since the word was last fetched. This refresh never produces a visible loading state in an already-open panel. The content updates quietly if the fetch resolves with new data.

Stale data is acceptable briefly: if `next_review` is a few seconds old when the panel opens, that is correct behavior.

### 6.2 Opening from search context

The full `NormalizedWord` payload is already resident in the React Query `['search', query]` cache. Pass it directly to `WordDetailContent` via `useWordDetail.open({ word: normalizedWord })`. No additional fetch is required.

The learning state (if the word is already saved) is derived from the vocabulary cache by matching `wordText` against the user's vocabulary — also in-memory.

**Result: the panel opens instantly from search context as well.**

### 6.3 Opening from deep link or future route

When `?word=ephemeral` is present in the URL on page load, or when the future `/words/:id` route is navigated to directly, no in-memory payload exists. A full fetch is required.

**Loading strategy:**
- Do not show a spinner for structured content
- Show a **skeleton** that pre-allocates the spatial layout of the content:
  - Word heading placeholder at correct font size (if word text is known from the URL param, render it immediately)
  - Two or three skeleton lines at meaning-length widths
  - The detail container is already open and sized — only the content is loading

**Rationale:** A spinner communicates "something is happening, I don't know where." A skeleton communicates "this content is loading here." Skeletons produce dramatically lower perceived wait time for structured content.

**Error state:**
- Word heading visible (from URL param if available)
- "Could not load definitions" message
- Retry link
- The container remains open — do not close on error

### 6.4 Panel content during word-to-word navigation

When navigating to the next word via ‹ › arrows or keyboard:

1. **The panel header (word text + transcription) updates immediately** from the `sourceList` metadata — no fetch required for this layer
2. **The previous meanings content remains visible** until the new content resolves
3. **Cross-fade (150ms)** when new content is ready — the meanings section fades from old to new
4. **`keepPreviousData: true`** behavior on the word data query ensures previous content never blanks out

This requires that `useWordDetailData` separates the "header" data (word text, transcription — always available from `sourceList`) from the "content" data (meanings — may require a fetch). The panel always shows something meaningful.

**Perceived performance target:** Word-to-word navigation should feel instant for vocabulary words. The 150ms cross-fade should complete before the user is ready to interact with the new content.

**Rapid navigation:** If a user quickly browses through several words, only the latest navigation target matters. Pending fetches for intermediate words should be cancelled or their results discarded. The panel always shows the most recently selected word.

### 6.5 Optimistic switching behavior

When the user selects a new row while the panel is open:
1. The active row highlight moves to the new row immediately
2. The panel header updates immediately (word text + transcription from `sourceList`)
3. The meanings section shows the previous content (not blank) while the new content loads
4. Cross-fade when ready

This order ensures the UI feels responsive even when a background fetch is needed.

---

## 7. `useWordDetail` Hook Architecture

The hook must not become a god object. The following separation of concerns prevents a single oversized hook from accumulating all open/close state, data fetching, keyboard bindings, container selection, and navigation logic.

### 7.1 Layered architecture

```
useWordDetailState       — pure UI state, no side effects, fully testable
  isOpen: boolean
  activeWordId: string | null
  sourceList: string[]        // word IDs in current filtered/sorted order
  activeIndex: number         // current position in sourceList
  open(wordId, sourceList)
  close()
  navigateTo(index)
  navigateNext()
  navigatePrev()

useWordDetailData        — data orchestration, no UI state
  Receives: activeWordId, wordText (from sourceList metadata)
  Returns: { word: WordPayload | undefined, learningState: LearningState | null, isLoading, error }
  Implements the three-path resolution strategy:
    1. Vocabulary cache — instant
    2. Search cache     — instant
    3. API fetch        — async, triggers skeleton

useWordDetailKeyboard    — keyboard event bindings, progressive enhancement
  Receives: { isOpen, navigatePrev, navigateNext, close }
  Attaches/detaches event listeners on isOpen change
  Handles: ↑/↓ (navigate), Escape (close)
  Desktop-only: no-ops on touch devices
  Zero knowledge of word data or UI rendering

WordDetailContainer      — rendering bridge
  Composes: useWordDetailState + useWordDetailData
  Calls: useWordDetailKeyboard (conditionally, desktop only)
  Renders: BottomSheet or SidePanel based on pointer/viewport
  Contains zero business logic
```

### 7.2 Public API surface

The only hook that feature components import:

```typescript
function useWordDetail(): {
  open: (args: { wordId: string; sourceList?: string[] } | { word: NormalizedWord }) => void
  close: () => void
  navigateNext: () => void
  navigatePrev: () => void
  isOpen: boolean
  activeWordId: string | null
}
```

This is a thin facade over `useWordDetailState`. Callers do not know about data fetching, keyboard bindings, or container rendering.

### 7.3 Context placement

`WordDetailState` lives in a `WordDetailProvider` that wraps pages (or the router level). Each page that supports detail opening is wrapped in `<WordDetailProvider>`. The provider mounts `WordDetailContainer` once — not per-row. One BottomSheet/SidePanel exists in the DOM at any time, regardless of how many rows are on screen.

```tsx
// VocabularyPage.tsx
<WordDetailProvider>
  <VocabularyList items={items} />
  {/* WordDetailContainer is rendered inside WordDetailProvider */}
</WordDetailProvider>
```

### 7.4 Data resolution in `useWordDetailData`

```typescript
// Priority resolution — executed in order, first hit wins:
function resolveWordPayload(wordId: string, wordText: string): WordPayload | undefined {
  // 1. Vocabulary cache (VocabularyWord payload) — instant, sufficient for full render
  const fromVocab = vocabularyCache.find(w => w.wordId === wordId)
  if (fromVocab) return toWordPayload(fromVocab)

  // 2. Search cache (NormalizedWord payload) — instant, sufficient for full render
  const fromSearch = searchCache.find(w => w.id === wordId || w.text === wordText)
  if (fromSearch) return toWordPayload(fromSearch)

  // 3. API fetch — async; triggers skeleton state
  return undefined  // React Query fetch initiated separately
}
```

### 7.5 Testing strategy

| Module | Test approach |
|--------|--------------|
| `useWordDetailState` | `renderHook` — pure state transitions, no mocks |
| `useWordDetailData` | Mock vocabulary cache, search cache, fetch — test priority resolution |
| `useWordDetailKeyboard` | Unit test handler attachment/detachment, key routing — no DOM |
| `WordDetailContainer` | Integration test — renders correct container variant |

---

## 8. URL Synchronization

URL state for the detail panel is not an afterthought — it is an architectural principle established from day one.

### 8.1 The principle

Opening a word detail is contextual focus (§3), but that focus state should be representable in the URL. If a user shares a vocabulary URL, the recipient should see the same context. If a user refreshes, the detail should reopen.

> Application state that is visible to the user and meaningful to share must not become opaque in-memory state.

### 8.2 URL design

**In-context browsing (vocabulary / search):**
```
/vocabulary?word=ephemeral
/search?q=ephemeral&word=ephemeral
```

**Future canonical route:**
```
/words/a1b2c3d4-...     (UUID — stable, not text-based)
```

The query param uses the word text (`?word=ephemeral`) rather than the UUID (`?wordId=...`) for human readability and shareability. The text is case-insensitive by design (citext at the DB level). URL encoding handles special characters.

### 8.3 Navigation type

| Action | History behavior | Rationale |
|--------|-----------------|-----------|
| Open detail initially | `pushState` | Creates a back-button entry — pressing back closes the panel |
| Navigate word-to-word (‹ ›, keyboard) | `replaceState` | No history entry per word — back closes the panel, not undoes navigation |
| Close the panel | `replaceState` removes `?word=` | Returns to the base URL; no orphaned history entries |

If the user browses 10 words within the panel and presses back, they return to the base vocabulary page — not to the 9th word. This is the correct behavior for an inspector, not a navigation stack.

### 8.4 React Router integration

```typescript
// Read on mount — restore panel from URL
const [params] = useSearchParams()
const wordFromUrl = params.get('word')
useEffect(() => {
  if (wordFromUrl) openWordDetail({ wordText: wordFromUrl })
}, [])  // mount only

// Write on open
const handleOpen = (word: string) => {
  openWordDetail({ wordId, sourceList })
  setSearchParams({ word }, { replace: false })
}

// Write on word-to-word navigation
const handleNavigate = (word: string) => {
  navigateWordDetail(newIndex)
  setSearchParams({ word }, { replace: true })
}

// Write on close
const handleClose = () => {
  closeWordDetail()
  setSearchParams({})  // removes all panel params
}
```

### 8.5 Restoration on load

When `?word=ephemeral` is present on page load:
1. The vocabulary list loads normally
2. After the vocabulary cache is populated, open the detail for the matching word
3. Data resolution follows the three-path strategy (§7.4): vocabulary cache first, then search cache, then API fetch
4. If the word is not found in any source, close the panel and remove the URL param silently
5. No error toast — the URL may simply be stale

### 8.6 Future `/words/:id` route

When the canonical route is implemented, it reuses `WordDetailContent` inside a `WordDetailPage` component (a standard page with `Container` wrapping):

```tsx
// WordDetailPage.tsx — reuses the same content component
<Container>
  <WordDetailContent word={word} learningState={learningState} ... />
</Container>
```

Both the `?word=` param approach and the `/words/:id` route coexist:
- `?word=` for in-context browsing (vocabulary, search) — contextual focus
- `/words/:id` for canonical deep-linking and sharing — full page context

---

## 9. Search Refactor: Unified Knowledge Lookup

The search experience should simultaneously answer:
1. Is this word already in my vocabulary?
2. What does the dictionary say?

### Layout

```
┌──────────────────────────────────────────────────┐
│  ⌕  Search words…                                │
└──────────────────────────────────────────────────┘

── In your vocabulary ─────────────────────────────   (instant, from cache)
  ephemeral        /ɪˈfɛm…/   adj · Next review: tomorrow
  ephemeron        /ɪˈfɛm…/   noun · Reviewed 3d ago

── Dictionary ─────────────────────────────────────   (debounced 300ms, async)
  [full WordEntry for the top dictionary match]
```

### Behavior

**Vocabulary match section** — appears immediately as the user types if any saved word contains the input substring. Rendered as compact rows (word + transcription + first POS + review hint). Tapping/clicking opens `WordDetailContainer`. No loading state — entirely from React Query cache.

**Dictionary section** — the existing `WordEntry` display, debounced at 300ms. Appears below the vocabulary section when both exist. Rendered unchanged.

**Save action** — `WordDetailContainer` owns the canonical save interaction. `WordEntry` may retain an inline save shortcut, but the sheet/panel is the complete action surface.

**404 with vocabulary match** — if the dictionary API returns not-found but the user has a matching saved word, do not show the error state. Show the vocabulary match section clearly. The user has the word — that is the correct resolution.

**What this preserves:** The entire `useWordSearch` + `WordEntry` + `Sense` stack is unchanged. The vocabulary match section is purely additive — a new component reading from the existing `useVocabulary` cache.

---

## 10. Vocabulary Refactor: Personal Word Library

### 10.1 Density philosophy: editorial, not productivity

The vocabulary list must not feel like Jira, a file explorer, or a dense data table. Those patterns optimize for information throughput at the expense of reading pleasure. This app's vocabulary list should feel closer to a personal reading list in a premium reading app: calm, typographically considered, visually unhurried.

**Target rhythm: 72–88px per row.**

This is a deliberate step away from maximum density. At 80px per row, a standard mobile screen shows 8–10 words — enough to scan without feeling like a data grid. At 60+ words the list will scroll, which is correct and expected. Scrolling a calm list is not a problem; visual exhaustion from over-compression is.

**Typography hierarchy:**

```
Primary:    word text — serif, ~1.05rem, medium-to-semibold weight
            The word is the most important thing on the row.

Secondary:  first definition snippet — 1 line, truncated, secondary color, 0.875rem
            Enough context to recognize the word; not enough to replace the detail view.

Tertiary:   POS tag · learning signal — caption size, subdued
            Present but quiet. Never competes with the word.
```

**What this means in practice:**
- The word text has comfortable vertical padding — it is not squeezed to the edges
- The definition snippet has a clear visual relationship to the word (slightly smaller, lighter)
- Metadata (POS, review timing) is typographically distinct — smaller, more neutral
- There is a visible but fine separator between rows — enough to read boundaries without visual noise

### 10.2 Row anatomy

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  ephemeral              adj ·  ◌ due in 2 days               │
│  lasting a very short time; short-lived                       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

- Tap/click anywhere on the row body → opens `WordDetailContainer`
- The row does **not** contain a permanently-visible delete button
- Row actions are accessible via a contextual affordance (see §10.3)
- Horizontal padding matches the detail panel's content gutter so the word text aligns across both panes on desktop

### 10.3 Row actions: discoverable without noisy

A faint "⋯" icon appears at the trailing edge of each row. On desktop it fades in on hover. On mobile it is always faintly present (opacity: ~0.35) — visible on inspection, not distracting in a scan.

Tapping/clicking the ⋯ opens a small popover menu:

```
┌──────────────────────────┐
│  Remove from vocabulary   │
│  Add note           soon  │
│  Mark as known      soon  │
└──────────────────────────┘
```

**Rationale:**
- Always-present (even if faint) → discoverable without requiring interaction
- Popover menu → scalable to future actions without redesigning the row
- No swipe required → works uniformly across platforms
- No permanent remove icon on every row → visual calm preserved
- Destructive action is one tap + confirm, not a single gesture

**Desktop hover states:**
```
row idle:     ⋯ icon at opacity 0.25 (barely visible)
row hovered:  ⋯ icon at opacity 1.0, row gets subtle background tint
active row:   ⋯ icon at full opacity at all times
```

### 10.4 Internal vocabulary search + sort

```
┌──────────────────────────────────────────────────────────────┐
│  ⌕  Filter…                               Sort: Recent ▾     │
└──────────────────────────────────────────────────────────────┘
  28 words
```

Client-side, instant, no API call. Sort options: Recently added · Alphabetical · Review due first · Last reviewed.

The word count updates as the filter changes. Zero results shows a soft empty state ("No words match "xyz"") rather than the regular empty state.

### 10.5 Living library signals

A small text annotation in the tertiary position communicates the current learning state:

| State | Indicator | Color |
|-------|-----------|-------|
| Due for review now | `review now` | accent (purple) |
| Due within 48h | `due in 1 day` / `due in 2 days` | amber/warm |
| Due in 3–7 days | `due in N days` | secondary (neutral) |
| Recently reviewed (< 24h) | `reviewed today` | success/green |
| Reviewed within a week | `reviewed 3d ago` | secondary (neutral) |
| Never reviewed (new) | `not yet reviewed` or omit | secondary, faint |

These derive from `next_review` and `last_reviewed_at` already returned by `GET /vocabulary`. No new endpoints needed.

The goal is not a score or a badge — it is a quiet sense of momentum. Gamification elements (streaks, XP) belong to the Home dashboard, not here.

### 10.6 Virtualization and scaling constraints

The 72–88px row rhythm is compatible with virtual scrolling. These constraints must hold from the initial implementation to keep virtualization addable without redesign.

**Row height contract:**
- All rows must render at a **stable, deterministic height** regardless of content
- Definition snippets are truncated to exactly 1 line — no overflow that changes row height
- Learning signal text is always single-line — no wrapping
- This predictability is a prerequisite for `@tanstack/react-virtual`, `react-window`, or any windowed list library

**Index-based tracking:**
- Active row tracking uses `activeIndex` (integer) in state — never DOM element references
- `scrollToIndex` API of the virtual library is used for scroll restoration — not `element.scrollIntoView()`
- `scrollIntoView` does not work on unmounted virtual rows

**Filter/sort stability:**
- The filtered/sorted array passed to the list must be referentially stable across re-renders where filter/sort has not changed
- `useMemo` with stable dependency arrays — an unstable input array causes the virtual list to re-measure and lose scroll position

**When to introduce virtualization:**
- Not required in this refactor
- Introduce when vocabulary exceeds ~200 words on mobile (performance budget)
- `VocabularyList` should accept a `virtual?: boolean` prop that switches between a plain `<ul>` and a virtualized container — `VocabularyRow` itself does not change

**Current scaling target:** comfortably handle 500 words in the editorial layout without virtualization on modern devices. The architecture supports virtualization; the implementation defers it.

---

## 11. Screen Responsibility Breakdown

| Surface | Owns | Does NOT own |
|---------|------|--------------|
| **Search** | Global dictionary lookup · Vocabulary match section · Entry point to word detail | Vocabulary management · Full word detail rendering |
| **Vocabulary** | Personal word collection · Filter/sort · Learning signals · Entry point to word detail | Dictionary fetching · SRS scheduling |
| **Review** | Focused SRS training loop · Progress tracking · Rating submission | Dictionary browsing · Vocabulary CRUD |
| **WordDetailContent** | Full dictionary entry rendering · Save/unsave action · Learning status section | Container layout · Navigation · SRS logic · Data fetching |
| **BottomSheet / SidePanel** | Container layout · Open/close mechanics · Navigation arrows / keyboard events | Word data · Business logic |
| **WordDetailContainer** | Responsive container selection · `useWordDetail` hook surface | Content rendering |
| **Home** | Streak + stats summary · Due-today CTA · Recently saved words | Word detail · Direct review controls |

**The principle restated:** `WordDetailContent` is stateless display plus a single vocabulary action. It receives two payloads (dictionary, learning), renders them in full, and emits one event: save or unsave. All other behavior belongs to its container or to the calling surface.

---

## 12. Navigation Flows

### 12.1 From Vocabulary — mobile (BottomSheet)

```
/vocabulary?word=           ← URL param removed when closed
  │
  ├── filter input ─────────────────────── instant client-side filter
  │
  ├── row tap ──→ BottomSheet slides up; URL becomes ?word=ephemeral
  │               ├── word detail displayed (instant from vocabulary cache)
  │               ├── [Remove] → sheet closes, row removed, URL param cleared
  │               ├── ‹/› arrows → navigate words; URL replaceState per word
  │               └── drag down or backdrop tap → dismiss, URL param cleared
  │
  └── ⋯ menu tap → popover → [Remove from vocabulary] → confirm → removed
```

### 12.2 From Vocabulary — desktop (SidePanel)

```
/vocabulary?word=           ← URL param mirrors active panel state
  │
  ├── filter input ─────────────────────── instant client-side filter
  │
  ├── row click ──→ SidePanel slides in; list narrows; URL becomes ?word=ephemeral
  │               ├── active row highlighted (left accent bar + tint)
  │               ├── word detail displayed (instant from vocabulary cache)
  │               ├── click different row → content cross-fades; URL replaceState
  │               ├── ↑/↓ keyboard → navigate words; URL replaceState per word
  │               ├── [Remove] → word removed; panel closes or advances to next
  │               └── [×] or Escape → panel closes; list returns to full width; URL cleared
  │
  └── row ⋯ hover → popover → [Remove from vocabulary] → confirm → removed
```

### 12.3 From Search — both platforms

```
/search?q=ephemeral         ← query preserved in URL
  │
  ├── vocabulary section appears instantly (local cache match)
  │     └── row tap/click ──→ WordDetailContainer (vocabulary payload, instant)
  │                               └── same sheet/panel behavior as §12.1–12.2
  │
  └── dictionary section loads (300ms debounce)
        ├── word heading tap/click ──→ WordDetailContainer (NormalizedWord payload, instant)
        │                                  └── [+ Save] in detail → saves word
        └── inline [+ Save] shortcut → saves without opening detail
```

### 12.4 The detail view across origins

| Origin | Word state | Data source | Primary action |
|--------|-----------|-------------|----------------|
| Search, unsaved | Not in vocabulary | NormalizedWord from search cache | `+ Save word` |
| Search, saved | In vocabulary | NormalizedWord + LearningState from vocab cache | `Saved ✓` · tap to remove |
| Vocabulary | Always saved | VocabularyWord from vocab cache | `Remove from vocabulary` |
| Deep link | Unknown | API fetch (skeleton) | Depends on save state |

---

## 13. Contextual Browsing Behavior

Opening word detail is not a navigation event — it is a focus event (§3). The list is still the primary context.

### Principles

**List remains the anchor.** The vocabulary list is never hidden when the detail is open on desktop. On mobile, it is dimmed but present behind the sheet.

**Scroll position is always preserved.** Opening a detail, navigating between words, and closing the detail must never cause the list to jump or re-scroll. The list scrolls to keep the active word visible when keyboard navigation moves outside the viewport.

**Active row is always highlighted.** While the detail is open: a 2px left accent bar and a subtle background tint on desktop. On mobile, less critical since the list is behind the sheet.

**Browsing is frictionless.** On desktop, moving from word to word is a single click — the panel content cross-fades without closing. On mobile, ‹ › arrows achieve the same without requiring close-and-reopen.

**Keyboard navigation (desktop).** While the SidePanel is open: `↑`/`↓` navigate, `Escape` closes, `Enter` on a list row opens it. Progressive enhancement — the app functions correctly without it.

### State model

```typescript
interface WordDetailState {
  isOpen: boolean
  activeWordId: string | null
  sourceList: string[]         // word IDs in current filtered/sorted order at open time
  activeIndex: number          // current position in sourceList
}
```

`sourceList` is captured when the detail opens. Navigation arrows and keyboard move `activeIndex` within this snapshot. If the filter changes while the panel is open, `sourceList` updates to match without closing.

### Future-friendly extensions

- **`Cmd+K` / `Ctrl+K`**: command-palette search opening any word detail from any page
- **Pinned panel** (≥ 1440px): panel always visible, updates on row selection — opt-in
- **`/words/:id` deep-link**: `WordDetailContent` inside a `WordDetailPage` for shareable canonical URLs

---

## 14. Preserved: Review Flow

The Review page (`/review`) is explicitly out of scope. It is a focused training surface and must not become a browsing interface.

**One future-facing connection:** `WordDetailContent` may show a low-prominence "Review this word" link when the card is due or overdue. This navigates to `/review`. The reverse connection — Review linking to word detail mid-session — is intentionally excluded. Breaking the review session's focus would harm the training experience.

---

## 15. `WordDetailContent` Composition Model

`WordDetailContent` must not become a monolithic render tree that accumulates all word-related UI over time. It is composed of independent sections, each receiving only the data it needs.

### Conceptual section structure

```
WordDetailContent
  ├── DictionaryHeader
  │     word text, transcription, source attribution, save/remove action button
  │     Receives: WordPayload, learningState (for button state), onSave, onRemove
  │
  ├── MeaningGroup[]
  │     One group per part of speech; each contains Sense[] components
  │     Sense is unchanged — already an independent component
  │     Receives: POS label, Meaning[]
  │
  ├── SynonymSection (optional — omitted when no synonyms exist)
  │     Synonym chips/tags
  │     Receives: string[]
  │
  ├── LearningSection (optional — omitted when learningState is null)
  │     Review timing, card state, "review now" link
  │     Receives: LearningState
  │     No dictionary data — enforces §4 boundary at component level
  │
  └── NotesSection (future — omitted until CardNote entity exists)
        User annotation, mnemonic, custom examples
        Receives: CardNote | null
        No dictionary data
```

### Composition rules

1. **Each section receives only what it needs.** No threading of the full word object through every section — only the specific slice of data that section renders.

2. **Sections communicate upward only via callbacks.** (`onSave`, `onRemove`, future: `onAddNote`) — never mutate shared data directly.

3. **Sections have zero knowledge of their container.** Whether they are inside a BottomSheet, a SidePanel, or a standalone page route is irrelevant to them.

4. **Future additions append new sections.** Adding `NotesSection`, `AiExplanationSection`, or `DifficultySection` does not require modifying `DictionaryHeader`, `MeaningGroup`, or `LearningSection`.

5. **Learning sections never receive `WordPayload` fields.** `LearningSection` receives `LearningState` only. This is enforced by TypeScript interfaces, not convention.

### Visual separation between layers

The dictionary layer (Header + Meanings + Synonyms) and the learning layer (Learning + Notes) are separated by a visible rule or spacing break. This is the §4 architecture boundary made visible — the user can see which content is from the dictionary and which is personal.

---

## 16. Information Hierarchy

### WordDetailContent — content order

```
─── Dictionary layer ─────────────────────────────────────────
1.  Word text             (largest type — the thing being learned)
2.  Pronunciation         (phonetic; secondary size)
3.  Source attribution    (caption; credibility signal, not primary)
4.  Save/remove action    (the user's relationship to this word)
─── Meanings ─────────────────────────────────────────────────
5.  Part of speech header (section organizer; subtle label style)
6.  Senses with examples  (the core content; scrollable)
7.  Synonyms              (expansion; tags below senses)
─── Learning layer ───────────────────────────────────────────
8.  Review status         (card state: next review, ease, interval)
9.  (future) User notes   (personal annotation)
10. (future) Custom examples / mnemonics
```

Items 1–4 are always above the fold. Items 5–7 scroll. Items 8–10 appear as a clearly separated section — a visual break marks the transition from dictionary data to personal learning data. This enforces the §4 boundary at the visual level.

### VocabularyRow — reading hierarchy

```
Primary:    word text — serif, ~1.05rem, medium weight
Secondary:  definition snippet — one line, truncated, 0.875rem, secondary color
Tertiary:   POS tag · learning signal — 0.75rem, subdued
Action:     ⋯ at trailing edge — faint at rest, clear on hover/focus
```

### Search results — priority ordering

```
1. Vocabulary match section    (instant; "words you know")
2. Dictionary result           (300ms debounced; "what the dictionary says")
3. Not-found / error state     (only when no vocabulary match exists)
```

---

## 17. Accessibility

Accessibility is a first-class concern for every interactive element in this system, not a post-implementation checklist.

### 17.1 BottomSheet

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to the word heading element
- **Focus trap:** when the sheet opens, focus moves to the first interactive element inside (close button, or save/remove action if no close button)
- **Focus restoration:** capture the triggering row element in a ref before opening; call `.focus()` on it when the sheet closes
- **Escape** closes the sheet; drag-down and backdrop-tap also close it
- Drag handle: `aria-hidden="true"`, not focusable — decorative only
- Navigation arrows: `aria-label="Previous word"` / `aria-label="Next word"`
- Touch target minimum: **44×44px** for all interactive elements (close, navigation arrows, save/remove)
- Backdrop: `role="presentation"`, tap closes the sheet

### 17.2 SidePanel

- `role="complementary"` + `aria-label="Word detail"` — complementary is correct because the panel coexists with the main content (unlike `dialog`, which implies exclusive focus)
- **Does not trap focus** — users tab freely between the list and the panel
- **Announcement on open:** when the panel opens, announce the word name to screen readers via a live region or by moving focus to the panel heading
- **Escape** closes the panel; focus returns to the active list row
- Close button: `aria-label="Close word detail"`
- Panel keyboard shortcuts are documented via `aria-keyshortcuts` on the panel root for screen reader users

### 17.3 Vocabulary list rows

- Each row is a `<button>` element (native, not a `div` with `role="button"`)
- `aria-label="Open detail for [wordText]"` on the row button
- When detail is open for this row: `aria-pressed="true"` — the button is in an active state
- When detail is closed: `aria-pressed="false"`
- The ⋯ action button: `aria-label="Actions for [wordText]"` + `aria-haspopup="menu"`
- Actions popover: `role="menu"` with `role="menuitem"` children
- Remove confirm: accessible inline — not a native browser dialog (those are inaccessible on mobile)

### 17.4 Keyboard-driven contextual browsing

When the SidePanel is open and focus is inside it:
- `↑` / `↓` → `navigatePrev()` / `navigateNext()`
- `Escape` → close panel, return focus to active row
- When navigating via keyboard: the new word heading receives focus and is announced by screen readers

When keyboard focus is in the vocabulary list (SidePanel open):
- `Enter` → opens detail for the focused row
- `Tab` → moves between rows and the panel normally

### 17.5 Screen reader row state

When keyboard navigation moves between words in the panel, screen readers should announce:
- "[word] — [first definition snippet]"

This can be achieved with a live region (`aria-live="polite"`) that updates with each navigation event, or by moving focus to the panel heading.

### 17.6 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  /* All transitions collapse to instant */
  .bottomSheet, .sidePanel, .wordDetailContent, .row {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}
```

- BottomSheet: appears/disappears instantly (no slide)
- SidePanel: appears/disappears instantly (no push transition)
- Content cross-fades: instant switches
- Row hover backgrounds: non-animated at all times (opacity/color changes are safe even under reduced motion — they do not trigger vestibular response)

---

## 18. Motion Philosophy

> Motion should reinforce spatial continuity, not draw attention to itself.

Every animation in this system has a spatial justification. Animations that exist to express personality or delight are absent. The target register: calm, fast, editorial, tool-like.

### 18.1 Spatial mapping

Each transition communicates directionality — where the element came from and where it went:

| Animation | Direction | Rationale |
|-----------|-----------|-----------|
| BottomSheet enter | Slides up from bottom | Comes from below the viewport |
| BottomSheet exit | Slides down | Returns below |
| SidePanel enter | Slides in from right edge | Enters from off-screen right |
| SidePanel exit | Slides out to right | Returns there |
| List narrowing | Compresses left | Makes room for the panel |
| Content cross-fade | In-place | A data update, not a spatial move |

### 18.2 Timing specifications

```
BottomSheet enter:     220ms  ease-out        (decelerates to rest)
BottomSheet exit:      160ms  ease-in         (accelerates away)
SidePanel enter:       220ms  ease-out
SidePanel exit:        160ms  ease-in
List width transition: 200ms  ease-out        (gentle layout reflow)
Content cross-fade:    150ms  ease-in-out     (symmetric; felt as a data update)
Row hover background:   80ms  ease            (immediate, not laggy)
Active row accent:     100ms  ease            (confirms selection)
```

Durations above 300ms are not used for any interactive response. The user acted — the response should be fast.

### 18.3 Browsing responsiveness

When a user rapidly navigates through words, the panel must feel like a responsive instrument, not a queued animation sequence:
- Cross-fades do not queue — the latest word always wins
- Pending transitions for intermediate words are cancelled
- At rapid pace, the 150ms cross-fade may complete before the user's next action — this is the correct experience

### 18.4 What to avoid

- **Spring/elastic animations** — they overshoot and feel playful, not editorial
- **Stagger effects on list items** — they make lists feel like product demos
- **Large-scale page transitions** — this is a tool, not a presentation
- **Long durations** — nothing interactive should take > 300ms
- **Dramatic panel entry** — the SidePanel should feel like sliding a window open, not a scene change

### 18.5 Reduced motion

All durations collapse to 0ms under `prefers-reduced-motion: reduce` (see §17.6). Background color changes and opacity transitions on static elements are preserved — they do not trigger vestibular response.

---

## 19. Component Architecture

### New components

| Component | Location | Purpose |
|-----------|----------|---------|
| `WordDetailContent` | `shared/ui/WordDetail/` | Section-composed inner display (§15) |
| `DictionaryHeader` | `shared/ui/WordDetail/` | Word, transcription, source, save action |
| `LearningSection` | `shared/ui/WordDetail/` | Card state display; null when unsaved |
| `BottomSheet` | `shared/ui/WordDetail/` | Mobile container: drag, snap, backdrop |
| `SidePanel` | `shared/ui/WordDetail/` | Desktop container: push layout, keyboard |
| `WordDetailContainer` | `shared/ui/WordDetail/` | Responsive selector |
| `WordDetailProvider` | `shared/ui/WordDetail/` | Context; mounts container once per page |
| `useWordDetail` | `shared/ui/WordDetail/` | Public hook facade |
| `useWordDetailState` | `shared/ui/WordDetail/` | Pure UI state |
| `useWordDetailData` | `shared/ui/WordDetail/` | Data resolution (three-path) |
| `useWordDetailKeyboard` | `shared/ui/WordDetail/` | Keyboard bindings (desktop only) |
| `VocabularyRow` | `features/vocabulary/ui/` | Editorial row; stable height; accessible |
| `VocabularyFilter` | `features/vocabulary/ui/` | Filter input + sort dropdown |
| `VocabularyMatchSection` | `features/word-search/ui/` | Vocabulary hits in search |
| `useVocabularySearch` | `features/vocabulary/model/` | Client-side filter, sort, review signals |

### Existing components — what changes

| Component | Change |
|-----------|--------|
| `WordEntry` | Extract display logic into `WordDetailContent` sections. Keep as thin wrapper for Search inline context. |
| `Sense` | No change — consumed by `MeaningGroup` inside `WordDetailContent` |
| `VocabularyItem` | Replaced by `VocabularyRow` |
| `VocabularyList` | Updated: uses `VocabularyRow`, filter header, active row state, virtual-ready |
| `VocabularyPage` | Wraps in `WordDetailProvider`; manages URL sync |
| `SearchPage` | Adds `VocabularyMatchSection` above dictionary section |

### Existing components — no change

`Flashcard`, `RatingButtons`, `SessionProgress`, `ReviewPage` — untouched.  
`AppHeader`, `PageLayout`, `Container`, `Card`, `Text`, `Button` — untouched.  
All backend API layer and existing hooks — unchanged or minimally extended.

---

## 20. Tradeoffs & Rationale

### Adaptive container vs. universal sheet

A bottom sheet on desktop fights the horizontal space that desktop provides. A side panel on mobile ignores that the list is now too narrow. The adaptive approach costs one extra abstraction layer but produces a meaningfully better experience on each form factor. The content component (`WordDetailContent`) pays no cost for this — it is entirely container-agnostic.

### SidePanel pushes list vs. overlays it

An overlay panel disconnects the active row from the panel content visually. Pushing the layout treats both as co-equal parts of the same view. Tradeoff: the vocabulary list must be aware that the panel is open (CSS `data-panel-open` or context value) — a manageable, non-deep coupling.

### 72–88px rows vs. 56–64px rows

This app is not a task management tool. Users browse a personal lexicon. The extra rhythm produces a calmer cadence that supports this emotional goal. Tradeoff: fewer words above the fold. Addressed by the filter/sort functionality.

### Kebab menu vs. swipe-only for row actions

Swipe is fast but undiscoverable without prior knowledge and has no desktop equivalent. A faint-but-always-present affordance works across platforms and scales to future actions without redesign.

### Client-side vocabulary search

Vocabulary is already in cache, sizes are bounded, instant feedback outweighs server-side power at this scale. No additional API endpoints needed.

### URL sync as architectural principle (not future work)

URL state that is visible to the user must be representable and restorable. Treating this as an afterthought produces opaque application state that breaks refresh, back navigation, and shareability. Establishing `?word=` from Phase 1 prevents retro-fitting later.

### Modular `useWordDetail` hooks vs. a single god hook

Separation of concerns enables independent testing and future modification. `useWordDetailState` can be tested with no mocks; `useWordDetailData` can be tested with mocked caches; `useWordDetailKeyboard` can be tested without DOM. A single large hook cannot be decomposed after the fact without breaking changes.

### Composition in `WordDetailContent` vs. monolithic component

As the product adds notes, AI explanations, meaning curation, and difficulty signals, a monolithic component becomes unmaintainable. Section composition means additions are always `+1 new section` — never "modify the existing render tree." Tradeoff: slightly more file structure. The long-term cost of the monolith is dramatically higher.

---

## 21. Implementation Order

### Phase 1 — Adaptive word detail infrastructure + vocabulary dead-end fix

**Goal:** Vocabulary entries are no longer dead ends. The full architecture is built correctly from day one.

1. Define `WordPayload` and `LearningState` TypeScript interfaces at the entity boundary
2. Extract `WordDetailContent` from `WordEntry` (display logic already exists); structure as section-composed (§15)
3. Build `useWordDetailState` (pure state, no side effects)
4. Build `useWordDetailData` (three-path resolution: vocab cache → search cache → API fetch)
5. Build `BottomSheet` container (drag handle, snap points, backdrop, focus trap)
6. Build `SidePanel` container (push layout, keyboard bindings, `aria-labelledby`)
7. Build `WordDetailContainer` — pointer/viewport responsive selector
8. Build `WordDetailProvider` — mounts container once; provides `useWordDetail` facade
9. Wire `VocabularyItem` → row tap → `useWordDetail.open(wordId)`
10. Add URL synchronization: `?word=` param on open/navigate/close (React Router `setSearchParams`)
11. Add accessibility: focus trap in BottomSheet, focus return on close, `aria-pressed` on active row
12. Verify `GET /api/words/:id` endpoint; add if missing

**Deliverable:** Users can open any vocabulary entry and see the full definition. Mobile = BottomSheet, desktop = SidePanel. URL reflects state. Accessible from day one.  
**Complexity:** Medium–High. The content exists; the containers, state model, and URL integration are new.

---

### Phase 2 — Editorial vocabulary rows + living library signals

**Goal:** Vocabulary page scales to large collections, feels alive, and is accessible.

1. Create `VocabularyRow` (72–88px stable height, typography hierarchy, virtual-list-ready)
2. Implement ⋯ popover with "Remove from vocabulary" + confirm; `aria-haspopup`, `role="menu"`
3. Replace `VocabularyItem` with `VocabularyRow` in `VocabularyList`
4. Add `VocabularyFilter` (client-side filter + sort; `useMemo` stable array)
5. Implement `useVocabularySearch` (filter + sort + review status computation)
6. Surface `next_review` and `last_reviewed_at` as natural-language signals on each row
7. Active row highlighting (left accent bar; `aria-pressed="true"` on active row button)
8. Apply motion spec: row hover 80ms; active row accent 100ms; no spring animations

**Deliverable:** Vocabulary page is editorially designed, scannable at 50+ words, shows learning state, accessible.  
**Complexity:** Medium.

---

### Phase 3 — Contextual browsing

**Goal:** Browsing multiple words in the detail view is frictionless and accessible.

1. Add `sourceList` and `activeIndex` to `WordDetailState`
2. Implement ‹ › navigation arrows in `BottomSheet` with `aria-label` and 44px touch targets
3. Implement `useWordDetailKeyboard` for SidePanel (↑/↓/Escape)
4. Preserve list scroll position on open/navigate/close; use `scrollToIndex` not `scrollIntoView`
5. Implement cross-fade (150ms) on word-to-word navigation; `keepPreviousData` to prevent flash
6. URL `replaceState` on word-to-word navigation (no history pollution)
7. Live region or focus move for screen reader announcements on navigation

**Deliverable:** Users browse vocabulary in the detail view without returning to the list. Keyboard-navigable.  
**Complexity:** Low–Medium.

---

### Phase 4 — Vocabulary match in Search

**Goal:** Search becomes a unified knowledge lookup.

1. Create `VocabularyMatchSection` (compact rows; same accessibility patterns as VocabularyRow)
2. Add substring match logic in `SearchPage` against vocabulary cache
3. Update `SearchPage` layout: vocabulary section above dictionary section
4. Handle "404 but vocabulary match exists" gracefully

**Deliverable:** Users see their saved words instantly while typing.  
**Complexity:** Low.

---

### Phase 5 — Adaptive detail from Search

**Goal:** Fully unified word detail experience across all surfaces.

1. Wire search result word heading → `useWordDetail.open({ word: NormalizedWord })` (no extra fetch)
2. Standardize save/remove button state across vocabulary and search origins
3. Optional: demote inline `WordEntry` save button — sheet/panel owns the canonical action

**Deliverable:** The same detail view, from any surface.  
**Complexity:** Low. Phase 1 infrastructure reused entirely.

---

### Future / out of scope for this refactor

- `/words/:id` dedicated route (`WordDetailPage` wrapping `WordDetailContent`)
- Review session connection to word detail
- `CardNote` entity and `NotesSection` component
- Relevant meaning selection (`CardMeaning`)
- AI-generated explanations
- Vocabulary tags and collections
- Virtualization (`VocabularyList` virtual-mode switch) — architecture supports it; defer to need
- Pinned panel on ≥ 1440px viewports
- `Cmd+K` global word search

---

## 22. Summary

This refactor delivers five things:

**One canonical view, two containers.**
`WordDetailContent` is built once, section-composed, and rendered inside a BottomSheet on mobile or a SidePanel on desktop. The interaction adapts; the content and architecture never do.

**An interaction model with a name.**
Contextual focus, not page navigation. This principle is stated explicitly (§3), and every architectural decision — push vs. overlay, URL params vs. routes, preserved scroll position, active row highlighting — is a direct consequence of it.

**Search that knows you.**
The vocabulary match section surfaces existing knowledge instantly. Local-first lookup, with the dictionary always a step behind.

**Vocabulary that breathes and lives.**
Editorial rows, generous rhythm, ambient learning signals, a discoverable action menu, and a filter bar turn a static receipt into a personal lexicon that communicates active learning progress.

**An architecture boundary that enables the future.**
Dictionary data and personal learning state are separated by TypeScript types, React Query cache namespaces, component interfaces, and visual hierarchy. Notes, meaning curation, mnemonics, custom examples, and AI explanations are each a new section in `WordDetailContent` — not a refactor of what exists.

The three mental models — discover, curate, internalize — remain distinct. The connective tissue is `WordDetailContainer`: a shared, responsive, context-aware component that honors the same word as a first-class knowledge object from every surface in the app.
