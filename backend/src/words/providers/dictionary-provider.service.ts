import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { NormalizedWord } from './provider.interface';
import { MerriamProvider } from './merriam/merriam.provider';
import { FreeDictionaryProvider } from './free-dictionary/free-dictionary.provider';

/**
 * Cascades dictionary lookups across providers.
 *   1. Try Merriam-Webster (if `isAvailable()`)
 *   2. On null (not found in MW) or thrown error → try Free Dictionary
 *   3. If both miss: throw 404; if both fail: throw 503
 *
 * The cascade hides provider identity from the rest of the app — callers see
 * `NormalizedWord` only.
 */
@Injectable()
export class DictionaryProviderService {
  private readonly logger = new Logger(DictionaryProviderService.name);

  constructor(
    private readonly merriam: MerriamProvider,
    private readonly freeDictionary: FreeDictionaryProvider,
  ) {}

  async fetchWord(text: string): Promise<NormalizedWord> {
    let mwUnavailable = false;

    if (this.merriam.isAvailable()) {
      try {
        const result = await this.merriam.fetchWord(text);
        if (result) return result;
        // null = not found in MW, fall through to FD
      } catch (err) {
        mwUnavailable = true;
        this.logger.warn(
          `MW failed for "${text}", falling back to Free Dictionary: ${String(err)}`,
        );
      }
    }

    let fdUnavailable = false;
    try {
      const result = await this.freeDictionary.fetchWord(text);
      if (result) return result;
    } catch (err) {
      fdUnavailable = true;
      this.logger.warn(`FD failed for "${text}": ${String(err)}`);
    }

    if (mwUnavailable && fdUnavailable) {
      throw new ServiceUnavailableException(
        'All dictionary providers are unavailable',
      );
    }

    throw new NotFoundException(`Word "${text}" not found`);
  }
}
