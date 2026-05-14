import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IDictionaryProvider,
  NormalizedWord,
} from '../provider.interface';
import { DictionaryProvider } from '../provider.interface';
import type { MwEntry, MwResponse } from './merriam.dto';
import { normalizeMerriamEntry } from './merriam.normalizer';

const MW_BASE =
  'https://www.dictionaryapi.com/api/v3/references/learners/json';
const FETCH_TIMEOUT_MS = 8_000;

@Injectable()
export class MerriamProvider implements IDictionaryProvider {
  readonly name = DictionaryProvider.MERRIAM;
  private readonly logger = new Logger(MerriamProvider.name);
  private readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('MERRIAM_API_KEY');
    if (this.apiKey) {
      const masked = this.apiKey.slice(0, 4) + '****';
      this.logger.log(`MERRIAM_API_KEY loaded: ${masked}`);
    } else {
      this.logger.warn('MERRIAM_API_KEY not set — falling back to Free Dictionary API');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async fetchWord(text: string): Promise<NormalizedWord | null> {
    const key = this.apiKey;
    if (!key) {
      throw new ServiceUnavailableException('MERRIAM_API_KEY not configured');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${MW_BASE}/${encodeURIComponent(text)}?key=${key}`,
        { signal: controller.signal },
      );
    } catch (err) {
      this.logger.warn(`MW fetch threw for "${text}": ${String(err)}`);
      throw new ServiceUnavailableException('Merriam-Webster API unreachable');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      this.logger.warn(`MW returned status ${response.status} for "${text}"`);
      throw new ServiceUnavailableException(
        `Merriam-Webster API returned ${response.status}`,
      );
    }

    const data = (await response.json()) as MwResponse;

    if (
      !Array.isArray(data) ||
      data.length === 0 ||
      typeof data[0] === 'string'
    ) {
      return null;
    }

    const firstEntry = data[0] as MwEntry;
    const normalized = normalizeMerriamEntry(text, firstEntry);

    if (normalized.meanings.length === 0) {
      return null;
    }

    return normalized;
  }
}
