import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ITranslationProvider,
  NormalizedTranslation,
} from '../provider.interface';
import { TranslationProvider } from '../provider.interface';

const FETCH_TIMEOUT_MS = 8_000;

/**
 * DeepL's supported target languages, expressed as our lowercased ISO codes.
 * This Set IS the support matrix — `supports()` checks membership here.
 *
 * Hand-maintained for now. TODO: a weekly job could refresh this from DeepL's
 * `GET /v2/languages?type=target` so newly added languages light up without a
 * deploy. Deferred until we have job infrastructure — this Set is the single
 * place such a job would overwrite.
 */
const DEEPL_TARGETS = new Set<string>([
  'ar', 'bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fi', 'fr', 'hu',
  'id', 'it', 'ja', 'ko', 'lt', 'lv', 'nb', 'nl', 'pl', 'pt', 'ro', 'ru',
  'sk', 'sl', 'sv', 'tr', 'uk', 'zh',
]);

/**
 * Only codes whose DeepL target differs from a plain uppercase need an entry.
 * DeepL dropped bare 'EN'/'PT' as targets, so they must carry a region; every
 * other language (ru→RU, de→DE, …) is derived by uppercasing.
 */
const DEEPL_OVERRIDES: Record<string, string> = {
  en: 'EN-US',
  pt: 'PT-BR',
};

function toDeeplCode(isoLower: string): string {
  return DEEPL_OVERRIDES[isoLower] ?? isoLower.toUpperCase();
}

interface DeeplResponse {
  translations?: { text: string; detected_source_language: string }[];
}

@Injectable()
export class DeeplProvider implements ITranslationProvider {
  readonly name = TranslationProvider.DEEPL;
  private readonly logger = new Logger(DeeplProvider.name);
  private readonly apiKey: string | undefined;
  /** Free keys end with ':fx' and use a different host than Pro keys. */
  private readonly endpoint: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('DEEPL_API_KEY');
    const isFree = this.apiKey?.endsWith(':fx');
    this.endpoint = isFree
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    if (this.apiKey) {
      this.logger.log(
        `DEEPL_API_KEY loaded (${isFree ? 'free' : 'pro'} tier): ${this.apiKey.slice(0, 4)}****`,
      );
    } else {
      this.logger.warn('DEEPL_API_KEY not set — translation provider disabled');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  supports(targetLang: string): boolean {
    return DEEPL_TARGETS.has(targetLang.toLowerCase());
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<NormalizedTranslation | null> {
    const key = this.apiKey;
    if (!key) {
      throw new ServiceUnavailableException('DEEPL_API_KEY not configured');
    }

    const lc = targetLang.toLowerCase();
    if (!DEEPL_TARGETS.has(lc)) {
      // Defensive: the selector already gates on supports(); treat as unsupported.
      return null;
    }
    const target = toDeeplCode(lc);

    const body = new URLSearchParams({
      text,
      target_lang: target,
      source_lang: sourceLang.toUpperCase(),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      this.logger.warn(`DeepL fetch threw for "${text}": ${String(err)}`);
      throw new ServiceUnavailableException('DeepL API unreachable');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      this.logger.warn(`DeepL returned status ${response.status} for "${text}"`);
      throw new ServiceUnavailableException(
        `DeepL API returned ${response.status}`,
      );
    }

    const data = (await response.json()) as DeeplResponse;
    const translated = data.translations?.[0]?.text?.trim();
    if (!translated) return null;

    return { text: translated, provider: this.name };
  }
}
