import { isAllowedAudioUrl, ALLOWED_AUDIO_HOSTS } from './remote-audio';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MW_AUDIO =
  'https://media.merriam-webster.com/audio/prons/en/us/mp3/r/rabbit01.mp3';
const FD_AUDIO =
  'https://api.dictionaryapi.dev/media/pronunciations/en/rabbit-us.mp3';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('isAllowedAudioUrl', () => {
  describe('accepts', () => {
    it.each([MW_AUDIO, FD_AUDIO])('the https URL %s', (url) => {
      expect(isAllowedAudioUrl(url)).toBe(true);
    });

    it('every host on the allow-list', () => {
      for (const host of ALLOWED_AUDIO_HOSTS) {
        expect(isAllowedAudioUrl(`https://${host}/a.mp3`)).toBe(true);
      }
    });
  });

  describe('rejects SSRF targets', () => {
    // The whole point of the allow-list: an upstream dictionary that returns a
    // hostile `audio` field must not be able to steer the server anywhere.
    it.each([
      ['the cloud metadata endpoint', 'http://169.254.169.254/latest/meta-data/'],
      ['loopback', 'http://127.0.0.1:9000/learnenglish-audio'],
      ['localhost by name', 'http://localhost:5432/'],
      ['an internal compose service', 'http://minio:9000/bucket'],
      ['a private range address', 'http://10.0.0.5/secret'],
      ['the file scheme', 'file:///etc/passwd'],
    ])('%s', (_label, url) => {
      expect(isAllowedAudioUrl(url)).toBe(false);
    });
  });

  describe('rejects near-misses', () => {
    it.each([
      // http is refused even for allow-listed hosts: the bytes get stored
      // permanently, so an on-path attacker must not be able to swap them.
      ['plain http on an allowed host', 'http://media.merriam-webster.com/a.mp3'],
      ['a lookalike suffix', 'https://media.merriam-webster.com.evil.tld/a.mp3'],
      ['a lookalike prefix', 'https://evil-media.merriam-webster.com/a.mp3'],
      ['the host embedded in a path', 'https://evil.tld/media.merriam-webster.com/a.mp3'],
      ['credentials pointing elsewhere', 'https://media.merriam-webster.com@evil.tld/a.mp3'],
      ['a subdomain of an allowed host', 'https://cdn.api.dictionaryapi.dev/a.mp3'],
    ])('%s', (_label, url) => {
      expect(isAllowedAudioUrl(url)).toBe(false);
    });
  });

  describe('rejects malformed input', () => {
    it.each([
      ['an empty string', ''],
      ['a bare path', '/media/pronunciations/en/rabbit-us.mp3'],
      ['a protocol-relative URL', '//media.merriam-webster.com/a.mp3'],
      ['nonsense', 'not a url at all'],
    ])('%s', (_label, url) => {
      expect(isAllowedAudioUrl(url)).toBe(false);
    });
  });
});
