import { pickByAccent } from './free-dictionary-pronunciation.provider';
import { PronunciationAccent } from '../../../database/enums/pronunciation-accent.enum';

// ── Helpers ──────────────────────────────────────────────────────────────────

const FD = 'https://api.dictionaryapi.dev/media/pronunciations/en';
const US = `${FD}/rabbit-us.mp3`;
const UK = `${FD}/rabbit-uk.mp3`;
const AU = `${FD}/rabbit-au.mp3`;
const UNLABELLED = `${FD}/rabbit.mp3`;

// ── Tests ─────────────────────────────────────────────────────────────────────

/**
 * Free Dictionary encodes the accent in the filename and its coverage is
 * uneven, so accent selection is where a wrong recording would slip through.
 * Serving a British voice to someone learning American pronunciation is worse
 * than serving nothing — the cascade can still fall through to Polly.
 */
describe('pickByAccent', () => {
  it('prefers the exact accent match', () => {
    expect(pickByAccent([UK, US, AU], PronunciationAccent.US)).toBe(US);
    expect(pickByAccent([UK, US, AU], PronunciationAccent.UK)).toBe(UK);
    expect(pickByAccent([UK, US, AU], PronunciationAccent.AU)).toBe(AU);
  });

  it('matches the suffix case-insensitively', () => {
    expect(pickByAccent([`${FD}/rabbit-US.MP3`], PronunciationAccent.US)).toBe(
      `${FD}/rabbit-US.MP3`,
    );
  });

  it('falls back to an unlabelled recording for the US default only', () => {
    expect(pickByAccent([UNLABELLED], PronunciationAccent.US)).toBe(UNLABELLED);
    expect(pickByAccent([UNLABELLED], PronunciationAccent.UK)).toBeNull();
    expect(pickByAccent([UNLABELLED], PronunciationAccent.AU)).toBeNull();
  });

  it('never substitutes one labelled accent for another', () => {
    expect(pickByAccent([UK], PronunciationAccent.US)).toBeNull();
    expect(pickByAccent([US], PronunciationAccent.UK)).toBeNull();
  });

  it('ignores recordings labelled with accents we do not serve', () => {
    // 'ca' / 'nz' / 'in' are recognised as labels, so they must not be mistaken
    // for the generic unlabelled fallback.
    expect(
      pickByAccent([`${FD}/rabbit-ca.mp3`], PronunciationAccent.US),
    ).toBeNull();
    expect(
      pickByAccent([`${FD}/rabbit-nz.mp3`], PronunciationAccent.US),
    ).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(pickByAccent([], PronunciationAccent.US)).toBeNull();
  });

  it('picks the exact match even when an unlabelled file comes first', () => {
    expect(pickByAccent([UNLABELLED, US], PronunciationAccent.US)).toBe(US);
  });
});
