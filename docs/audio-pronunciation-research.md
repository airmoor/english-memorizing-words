# Audio Pronunciation — Provider Research & Roadmap

> Status: **decided for MVP** → Amazon Polly Neural + S3 + CloudFront, DB-first eternal cache.
> This document keeps the full research so we can revisit alternatives later.
> Date: 2026-06-30.

## Constraints that shaped the decision

- Quality **TTS is acceptable** (we do not require human recordings).
- **Single words only** (no sentences/phrases for now) → ~5–8 chars per synth → cost is negligible.
- Self-hosting audio is **desired**; hotlinking acceptable only as a temporary fallback.
- Need a working **MVP now** + a **clear growth path**.

## The licensing watershed (most important finding)

Most "dictionary" APIs **forbid storing/redistributing their audio** — which kills
the "own storage + eternal cache" requirement. Only a subset can legally back a
self-hosted audio library.

| Source | Download | Store in own S3/DB | Serve to users | Eternal cache | Commercial | Verdict for self-hosting |
|---|---|---|---|---|---|---|
| **Amazon Polly** | ✅ | ✅ | ✅ | ✅ | ✅ (all tiers) | **Explicitly allowed, no restrictions** |
| **Azure Speech** | ✅ | ✅ | ✅ | ✅ | ✅ paid S0 only | Allowed on paid tier |
| **Google Cloud TTS** | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | Allowed, but verify Service Specific Terms |
| **OpenAI TTS** | ✅ | ✅ | ✅ | ✅ | ✅ (incl. free API) | Allowed; weak UK/US accent control |
| **ElevenLabs** | ✅ | ✅ | ✅ | ✅ | ✅ paid only | Allowed on paid; free = attribution + non-commercial |
| **Wikimedia Commons / Wiktionary** | ✅ | ✅ | ✅ | ✅ | ✅ | Allowed (CC0 / CC-BY-SA w/ attribution) — **real human voices** |
| **Forvo API** | via API | ❌ caching forbidden | live only | ❌ links expire 2h | special license only | ❌ Incompatible with self-hosting |
| **Oxford Dictionaries API** | links in response | ❌ forbidden without Enterprise | live display only | ❌ | Enterprise license needed | ❌ Hosting only by separate contract |
| **Cambridge API** | ⚠️ | ❌ "evaluation only" | ❌ | ❌ | ❌ | ❌ Prototype/eval only |
| **Merriam-Webster API** | ✅ | ⚠️ limited | ⚠️ | ⚠️ | license + fee needed | ⚠️ Commercial only by contract |

**Takeaway:** Forvo, Oxford, Cambridge, Merriam-Webster are *access* APIs, not sources
for your own audio library. The only candidates that legally support "store + eternal
cache + serve from own CDN" are: **Amazon Polly, Azure (paid), OpenAI TTS,
ElevenLabs (paid), Wikimedia Commons.**

## Per-provider notes

### Amazon Polly ⭐ (chosen MVP base)
- Neural voices, very natural; for single words ~indistinguishable from premium.
- UK (Amy/Brian/Arthur), US (Joanna/Matthew/Danielle/Ruth), AU (Olivia).
- Pricing: Neural **$16 / 1M chars** (Standard $4, Generative $30, Long-form $100).
- Free tier: Neural 1M chars/mo for first 12 months.
- FAQ states verbatim: *"You can cache and replay Amazon Polly's generated speech…
  no restrictions on storing and reusing generated speech."*
- Economics: avg word ~6 chars → 1M Neural chars ≈ **~165k words**. The entire
  realistic unique-word base (50–100k words) costs **~$1–2 once**, then cached forever.

### Azure Speech (strong alternative / 2nd provider)
- Neural / Neural-HD on par with Polly; huge voice & style selection.
- Neural **$16 / 1M**, Neural-HD $22, commitment tiers down to $7.5 / 1M.
- Free F0 (500k/mo) has **no commercial output rights** — paid S0 required for prod.

### Google Cloud TTS
- WaveNet $4 / 1M (cheap!), Neural2 $16, Chirp3-HD $30, Studio $160.
- ⚠️ Storage/caching terms historically stricter — **verify current Service Specific
  Terms** before building an eternal cache. Polly gives a cleaner legal answer.

### OpenAI TTS
- Very natural; commercial on all tiers; output storable.
- ❌ Weak UK-vs-US accent control (neutral American) → worse fit for teaching pronunciation.

### ElevenLabs
- Best-in-class realism; credit pricing is expensive for millions of short words.
- Paid = own output, commercial, storable; free = attribution + non-commercial.
- Use point-wise (signature/premium voices), not as mass base.

### Wikimedia Commons / Wiktionary ⭐ (free human-voice layer)
- **Real native-speaker recordings** (Lingua Libre etc.).
- Coverage uneven (frequent words covered, long tail not); quality varies.
- License usually **CC0** (no attribution needed) or **CC-BY-SA** (attribution + share-alike).
- Can download, store in S3, serve, commercialize. Requires per-file license tracking.

## Recommended architecture (kept for reference)

```
Word ──1:N──> WordPronunciation ──N:1──> AudioAsset
```

- `WordPronunciation`: what we pronounce (accent, IPA, primary flag, status, FK to asset).
- `AudioAsset`: the file (provider, voice, is_human, storage_key, cdn_url, format,
  duration, content_hash UNIQUE for dedup, license, attribution, source_ref_url).

License/attribution columns are mandatory for legal defensibility (esp. Wikimedia).

## Roadmap (revisit later)

- **MVP (now):** Polly Neural, generate inline on first miss (single-flight, mirrors
  `TranslationsService`), store in S3, serve via CloudFront, cache forever.
- **Growth:** add Wikimedia CC0 human-voice layer for frequent words (provider abstraction),
  BullMQ pre-generation queue, multi-accent, Azure as 2nd TTS provider (failover),
  offline packs, predefined "studio"/custom recordings.
- **Duolingo/ELSA-scale:** Neural TTS as the 100%-coverage base + studio recordings for
  top-frequency words, CDN + offline + pre-generation from day one. Dictionaries/Forvo
  only as one-off bootstrap material under special license, never a runtime dependency.

## Sources

- Amazon Polly FAQs (caching/storing) — https://aws.amazon.com/polly/faqs/ ; Pricing — https://aws.amazon.com/polly/pricing/
- Azure Speech Pricing — https://azure.microsoft.com/en-us/pricing/details/speech/ ; Commercial-use Q&A — https://learn.microsoft.com/en-us/answers/questions/1192398/
- Google Cloud TTS Pricing — https://cloud.google.com/text-to-speech/pricing ; Data logging — https://docs.cloud.google.com/text-to-speech/docs/data-logging
- OpenAI TTS — https://developers.openai.com/api/docs/guides/text-to-speech ; ElevenLabs Terms — https://elevenlabs.io/terms-of-use
- Forvo API plans — https://api.forvo.com/plans-and-pricing/ ; Forvo license — https://forvo.com/license/
- Oxford API Terms — https://developer.oxforddictionaries.com/api-terms-and-conditions ; Cambridge API Terms — https://dictionary-api.cambridge.org/api/terms-and-conditions ; Merriam-Webster ToS — https://dictionaryapi.com/info/terms-of-service
- Wiktionary audio help — https://en.wiktionary.org/wiki/Help:Audio_pronunciations ; Commons CC-BY-SA — https://commons.wikimedia.org/wiki/Commons:CC-BY-SA
