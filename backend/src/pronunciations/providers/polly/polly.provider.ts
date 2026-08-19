import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  OutputFormat,
  TextType,
  type VoiceId,
} from '@aws-sdk/client-polly';
import type {
  IPronunciationProvider,
  NormalizedAudio,
} from '../provider.interface';
import {
  PronunciationProvider,
  PronunciationAccent,
} from '../provider.interface';

/**
 * Amazon Polly neural TTS provider.
 *
 * Polly's FAQ grants the right to store and reuse generated speech with no
 * restrictions, which is what lets us cache audio forever in our own bucket.
 * One synth per (word, accent) — the service layer guarantees we never call
 * this twice for the same pair.
 */
@Injectable()
export class PollyProvider implements IPronunciationProvider {
  readonly name = PronunciationProvider.AMAZON_POLLY;
  private readonly logger = new Logger(PollyProvider.name);

  private readonly client: PollyClient | null;
  /** Accent → Polly VoiceId. Voices are configurable via env. */
  private readonly voiceByAccent: Record<PronunciationAccent, string>;

  constructor(config: ConfigService) {
    const region = config.get<string>('AWS_REGION');
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');

    this.voiceByAccent = {
      [PronunciationAccent.US]: config.get<string>('POLLY_US_VOICE') ?? 'Joanna',
      [PronunciationAccent.UK]: config.get<string>('POLLY_UK_VOICE') ?? 'Amy',
      // Olivia is Polly's en-AU neural voice; only used once AU is offered.
      [PronunciationAccent.AU]: config.get<string>('POLLY_AU_VOICE') ?? 'Olivia',
    };

    if (region && accessKeyId && secretAccessKey) {
      this.client = new PollyClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`Amazon Polly enabled (region ${region})`);
    } else {
      this.client = null;
      this.logger.warn(
        'AWS credentials not set — Amazon Polly provider disabled',
      );
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async synthesize(
    text: string,
    accent: PronunciationAccent,
  ): Promise<NormalizedAudio | null> {
    const client = this.client;
    if (!client) {
      throw new ServiceUnavailableException('AWS credentials not configured');
    }

    const voice = this.voiceByAccent[accent];

    let response;
    try {
      response = await client.send(
        new SynthesizeSpeechCommand({
          Text: text,
          // Voices are configurable strings; the SDK types VoiceId as a closed
          // union, so we trust the configured value here.
          VoiceId: voice as VoiceId,
          Engine: Engine.NEURAL,
          OutputFormat: OutputFormat.MP3,
          TextType: TextType.TEXT,
          LanguageCode: undefined, // voice implies the locale
        }),
      );
    } catch (err) {
      this.logger.warn(`Polly synth failed for "${text}" (${voice}): ${String(err)}`);
      throw new ServiceUnavailableException('Amazon Polly unreachable');
    }

    if (!response.AudioStream) return null;

    // AWS SDK v3 streams expose transformToByteArray() in Node.
    const bytes = await response.AudioStream.transformToByteArray();
    const audio = Buffer.from(bytes);
    if (audio.length === 0) return null;

    return {
      audio,
      format: 'mp3',
      contentType: 'audio/mpeg',
      voice,
      isHuman: false,
      license: 'amazon-polly-tos',
      attribution: null,
      sourceRefUrl: null,
      provider: this.name,
    };
  }
}
