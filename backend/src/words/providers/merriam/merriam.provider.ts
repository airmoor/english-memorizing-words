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
import type { MwEntry, MwResponse } from './merriam.dto';
import { normalizeMerriamEntry } from './merriam.normalizer';

const MW_BASE =
  'https://www.dictionaryapi.com/api/v3/references/learners/json';

@Injectable()
export class MerriamProvider implements IDictionaryProvider {
  readonly name = 'merriam-webster' as const;
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
      // isAvailable() should have gated this; throw so the selector can fall back
      throw new ServiceUnavailableException('MERRIAM_API_KEY not configured');
    }

    let response: Response;
    try {
      response = await fetch(
        `${MW_BASE}/${encodeURIComponent(text)}?key=${key}`,
      );
    } catch (err) {
      this.logger.warn(`MW fetch threw for "${text}": ${String(err)}`);
      throw new ServiceUnavailableException('Merriam-Webster API unreachable');
    }

    if (!response.ok) {
      this.logger.warn(`MW returned status ${response.status} for "${text}"`);
      throw new ServiceUnavailableException(
        `Merriam-Webster API returned ${response.status}`,
      );
    }

    const data = (await response.json()) as MwResponse;

    // Empty array OR string[] (MW's "did you mean…" suggestion shape) → not found
    if (
      !Array.isArray(data) ||
      data.length === 0 ||
      typeof data[0] === 'string'
    ) {
      return null;
    }

    // Per design.md: consume only entries[0]
    const firstEntry = data[0] as MwEntry;
    const normalized = normalizeMerriamEntry(text, firstEntry);

    if (normalized.meanings.length === 0) {
      // MW returned an entry shape but no parseable senses — treat as miss
      return null;
    }

    return normalized;
  }
}
