import { normalizeSearchText, normalizeApiResponse, ApiEntry } from './normalize';

describe('normalizeSearchText', () => {
  it('lowercases', () => expect(normalizeSearchText('HELLO')).toBe('hello'));
  it('trims leading/trailing whitespace', () => expect(normalizeSearchText('  hello  ')).toBe('hello'));
  it('collapses internal spaces', () => expect(normalizeSearchText('hello   world')).toBe('hello world'));
  it('applies NFKC Unicode normalization', () => {
    // U+2126 OHM SIGN → U+03A9 GREEK CAPITAL LETTER OMEGA, then lowercased
    expect(normalizeSearchText('Ω')).toBe('ω');
  });
});

describe('normalizeApiResponse', () => {
  const fullEntry: ApiEntry = {
    word: 'hello',
    phonetics: [
      { text: '', audio: '' },
      { text: '/həˈloʊ/', audio: 'some.mp3' },
    ],
    meanings: [
      {
        partOfSpeech: 'exclamation',
        definitions: [
          {
            definition: 'used as a greeting',
            example: 'Hello there!',
            synonyms: ['hi', 'hey'],
          },
          {
            definition: 'used to express surprise',
          },
        ],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          { definition: 'an utterance of "hello"', synonyms: [] },
        ],
      },
    ],
  };

  it('picks first non-empty phonetic text, skipping empty strings', () => {
    const result = normalizeApiResponse([fullEntry]);
    expect(result[0].transcription).toBe('/həˈloʊ/');
  });

  it('shares transcription across all meanings from the same word', () => {
    const result = normalizeApiResponse([fullEntry]);
    expect(result.every((m) => m.transcription === '/həˈloʊ/')).toBe(true);
  });

  it('creates one meaning row per definitions[j] entry', () => {
    const result = normalizeApiResponse([fullEntry]);
    expect(result).toHaveLength(3);
  });

  it('maps partOfSpeech correctly', () => {
    const result = normalizeApiResponse([fullEntry]);
    expect(result[0].partOfSpeech).toBe('exclamation');
    expect(result[2].partOfSpeech).toBe('noun');
  });

  it('wraps example in a single-element array', () => {
    const result = normalizeApiResponse([fullEntry]);
    expect(result[0].examples).toEqual(['Hello there!']);
  });

  it('uses empty array when example is absent', () => {
    const result = normalizeApiResponse([fullEntry]);
    expect(result[1].examples).toEqual([]);
  });

  it('uses synonyms from definition level', () => {
    const result = normalizeApiResponse([fullEntry]);
    expect(result[0].synonyms).toEqual(['hi', 'hey']);
  });

  it('defaults synonyms to [] when absent', () => {
    const result = normalizeApiResponse([fullEntry]);
    expect(result[1].synonyms).toEqual([]);
  });

  it('returns null transcription when no phonetic text exists', () => {
    const entry: ApiEntry = {
      word: 'test',
      phonetics: [{ audio: 'x.mp3' }, { text: '   ' }],
      meanings: [
        { definitions: [{ definition: 'a procedure' }] },
      ],
    };
    const result = normalizeApiResponse([entry]);
    expect(result[0].transcription).toBeNull();
  });

  it('processes multiple API entries (different etymologies)', () => {
    const entry2: ApiEntry = {
      word: 'hello',
      phonetics: [],
      meanings: [
        { partOfSpeech: 'verb', definitions: [{ definition: 'to say hello' }] },
      ],
    };
    const result = normalizeApiResponse([fullEntry, entry2]);
    expect(result).toHaveLength(4);
    expect(result[3].partOfSpeech).toBe('verb');
  });

  it('returns empty array for entries with no meanings', () => {
    const entry: ApiEntry = { word: 'x', phonetics: [], meanings: [] };
    expect(normalizeApiResponse([entry])).toEqual([]);
  });
});
