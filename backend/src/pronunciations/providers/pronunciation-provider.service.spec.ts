import { ServiceUnavailableException } from '@nestjs/common';
import { PronunciationProviderService } from './pronunciation-provider.service';
import {
  type IPronunciationProvider,
  type NormalizedAudio,
  PronunciationAccent,
  PronunciationProvider,
  ProviderUnreachableError,
} from './provider.interface';
import type { MerriamPronunciationProvider } from './merriam/merriam-pronunciation.provider';
import type { FreeDictionaryPronunciationProvider } from './free-dictionary/free-dictionary-pronunciation.provider';
import type { PollyProvider } from './polly/polly.provider';

// ── Helpers ──────────────────────────────────────────────────────────────────

const WORD = 'rabbit';
const US = PronunciationAccent.US;

function audioFrom(provider: PronunciationProvider): NormalizedAudio {
  return {
    audio: Buffer.from('fake-mp3'),
    format: 'mp3',
    contentType: 'audio/mpeg',
    voice: null,
    isHuman: true,
    license: 'test',
    attribution: null,
    sourceRefUrl: null,
    provider,
  };
}

type Behaviour = 'hit' | 'miss' | 'unreachable' | 'unavailable';

/** A stub provider whose single behaviour is dictated by the test. */
function stub(
  name: PronunciationProvider,
  behaviour: Behaviour,
): IPronunciationProvider & { calls: number } {
  return {
    name,
    calls: 0,
    isAvailable: () => behaviour !== 'unavailable',
    async synthesize(this: { calls: number }) {
      this.calls += 1;
      if (behaviour === 'hit') return audioFrom(name);
      if (behaviour === 'miss') return null;
      throw new ProviderUnreachableError(name, 'stubbed outage');
    },
  } as IPronunciationProvider & { calls: number };
}

function build(
  merriam: Behaviour,
  free: Behaviour,
  polly: Behaviour,
): {
  service: PronunciationProviderService;
  stubs: Record<string, { calls: number }>;
} {
  const m = stub(PronunciationProvider.MERRIAM_WEBSTER, merriam);
  const f = stub(PronunciationProvider.FREE_DICTIONARY, free);
  const p = stub(PronunciationProvider.AMAZON_POLLY, polly);
  const service = new PronunciationProviderService(
    m as unknown as MerriamPronunciationProvider,
    f as unknown as FreeDictionaryPronunciationProvider,
    p as unknown as PollyProvider,
  );
  return { service, stubs: { merriam: m, free: f, polly: p } };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PronunciationProviderService', () => {
  describe('cascade order', () => {
    it('prefers Merriam-Webster and does not touch the others', async () => {
      const { service, stubs } = build('hit', 'hit', 'hit');

      const { audio } = await service.synthesize(WORD, US);

      expect(audio?.provider).toBe(PronunciationProvider.MERRIAM_WEBSTER);
      expect(stubs.free.calls).toBe(0);
      expect(stubs.polly.calls).toBe(0);
    });

    it('falls through a miss to the next provider', async () => {
      const { service } = build('miss', 'hit', 'hit');

      const { audio } = await service.synthesize(WORD, US);

      expect(audio?.provider).toBe(PronunciationProvider.FREE_DICTIONARY);
    });

    it('reaches Polly only when both human sources miss', async () => {
      const { service } = build('miss', 'miss', 'hit');

      const { audio } = await service.synthesize(WORD, US);

      expect(audio?.provider).toBe(PronunciationProvider.AMAZON_POLLY);
    });

    it('skips providers that are not configured', async () => {
      const { service, stubs } = build('unavailable', 'hit', 'hit');

      const { audio } = await service.synthesize(WORD, US);

      expect(stubs.merriam.calls).toBe(0);
      expect(audio?.provider).toBe(PronunciationProvider.FREE_DICTIONARY);
    });
  });

  describe('degraded reporting', () => {
    // This flag is what keeps a network blip from being written into the
    // negative cache as "this word has no pronunciation".
    it('is false when every provider answered', async () => {
      const { service } = build('miss', 'miss', 'miss');

      const outcome = await service.synthesize(WORD, US);

      expect(outcome).toEqual({ audio: null, degraded: false });
    });

    it('is true when a provider could not be reached and nothing was found', async () => {
      const { service } = build('unreachable', 'miss', 'miss');

      const outcome = await service.synthesize(WORD, US);

      expect(outcome.audio).toBeNull();
      expect(outcome.degraded).toBe(true);
    });

    it('keeps going past an unreachable provider', async () => {
      const { service, stubs } = build('unreachable', 'unreachable', 'hit');

      const { audio, degraded } = await service.synthesize(WORD, US);

      expect(audio?.provider).toBe(PronunciationProvider.AMAZON_POLLY);
      expect(stubs.polly.calls).toBe(1);
      // Audio was found, but the earlier failures are still reported.
      expect(degraded).toBe(true);
    });

    it('treats Polly\'s ServiceUnavailableException as unreachable, not fatal', async () => {
      const { service } = build('miss', 'miss', 'miss');
      // Polly signals unavailability with the Nest exception rather than ours.
      const polly = (service as unknown as { providers: IPronunciationProvider[] })
        .providers[2];
      jest.spyOn(polly, 'synthesize').mockRejectedValue(
        new ServiceUnavailableException('Amazon Polly unreachable'),
      );

      const outcome = await service.synthesize(WORD, US);

      expect(outcome).toEqual({ audio: null, degraded: true });
    });
  });

  describe('misconfiguration', () => {
    it('throws 503 when no provider is configured at all', async () => {
      const { service } = build('unavailable', 'unavailable', 'unavailable');

      await expect(service.synthesize(WORD, US)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('unexpected errors', () => {
    it('propagates errors that are not provider outages', async () => {
      const { service } = build('miss', 'miss', 'miss');
      const polly = (service as unknown as { providers: IPronunciationProvider[] })
        .providers[2];
      jest
        .spyOn(polly, 'synthesize')
        .mockRejectedValue(new TypeError('programmer error'));

      await expect(service.synthesize(WORD, US)).rejects.toBeInstanceOf(
        TypeError,
      );
    });
  });
});
