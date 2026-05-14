import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  IDictionaryProvider,
  NormalizedWord,
} from '../provider.interface';
import { DictionaryProvider } from '../provider.interface';
import type { FdEntry } from './free-dictionary.dto';
import { normalizeFreeDictionary } from './free-dictionary.normalizer';

const FD_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const FETCH_TIMEOUT_MS = 8_000;

@Injectable()
export class FreeDictionaryProvider implements IDictionaryProvider {
  readonly name = DictionaryProvider.FREE;
  private readonly logger = new Logger(FreeDictionaryProvider.name);

  isAvailable(): boolean {
    return true;
  }

  async fetchWord(text: string): Promise<NormalizedWord | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${FD_BASE}/${encodeURIComponent(text)}`,
        { signal: controller.signal },
      );
    } catch (err) {
      this.logger.warn(`FD fetch threw for "${text}": ${String(err)}`);
      throw new ServiceUnavailableException('Free Dictionary API unreachable');
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 404) return null;

    if (!response.ok) {
      this.logger.warn(`FD returned status ${response.status} for "${text}"`);
      throw new ServiceUnavailableException(
        `Free Dictionary API returned ${response.status}`,
      );
    }

    const entries = (await response.json()) as FdEntry[];
    if (!Array.isArray(entries) || entries.length === 0) return null;

    return normalizeFreeDictionary(text, entries);
  }
}
