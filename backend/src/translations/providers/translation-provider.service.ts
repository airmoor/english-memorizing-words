import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { NormalizedTranslation } from './provider.interface';
import { DeeplProvider } from './deepl/deepl.provider';

/**
 * Selects a translation provider and hides provider identity from callers —
 * they see `NormalizedTranslation` only.
 *
 * v1 has a single provider (DeepL). The cascade shape mirrors
 * DictionaryProviderService so additional providers (Azure as a broad fallback,
 * an LLM for enrichment) slot in here without touching the service or schema.
 */
@Injectable()
export class TranslationProviderService {
  private readonly logger = new Logger(TranslationProviderService.name);

  constructor(private readonly deepl: DeeplProvider) {}

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<NormalizedTranslation | null> {
    if (this.deepl.isAvailable() && this.deepl.supports(targetLang)) {
      return this.deepl.translate(text, sourceLang, targetLang);
    }

    this.logger.warn(
      `No translation provider available for "${targetLang}" ` +
        `(deepl available=${this.deepl.isAvailable()}, supports=${this.deepl.supports(targetLang)})`,
    );
    throw new ServiceUnavailableException(
      `No translation provider available for language "${targetLang}"`,
    );
  }
}
