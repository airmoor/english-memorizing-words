import { subdirectoryFor } from './merriam-pronunciation.provider';

/**
 * Merriam-Webster does not return a media URL, only a filename — the
 * subdirectory has to be derived by their documented rule. Getting it wrong
 * yields a 404 from their CDN, which the cascade would silently swallow as
 * "this word has no audio", so the rule is worth pinning down.
 *
 * Reference: https://dictionaryapi.com/products/json#sec-2.prs
 */
describe('subdirectoryFor', () => {
  it.each([
    ['bixby01', 'bix'],
    ['bix', 'bix'],
  ])('routes %s to the "bix" bucket', (filename, expected) => {
    expect(subdirectoryFor(filename)).toBe(expected);
  });

  it.each([
    ['ggenus', 'gg'],
    ['gg', 'gg'],
  ])('routes %s to the "gg" bucket', (filename, expected) => {
    expect(subdirectoryFor(filename)).toBe(expected);
  });

  it.each([
    ['3d0001', 'number'],
    ['_dictionary', 'number'],
    ['0abc', 'number'],
  ])('routes %s to the "number" bucket', (filename, expected) => {
    expect(subdirectoryFor(filename)).toBe(expected);
  });

  it.each([
    ['rabbit', 'r'],
    ['apple01', 'a'],
    ['zebra', 'z'],
  ])('routes %s to its first letter', (filename, expected) => {
    expect(subdirectoryFor(filename)).toBe(expected);
  });

  it('keeps the "bix"/"gg" rules ahead of the first-letter rule', () => {
    // Without the special cases these would land in "b" and "g".
    expect(subdirectoryFor('bixby01')).not.toBe('b');
    expect(subdirectoryFor('ggenus')).not.toBe('g');
  });

  it('does not treat a mere "b" or "g" word as a special bucket', () => {
    expect(subdirectoryFor('bison')).toBe('b');
    expect(subdirectoryFor('goose')).toBe('g');
  });
});
