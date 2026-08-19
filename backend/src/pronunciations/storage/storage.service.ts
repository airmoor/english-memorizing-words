import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';

/**
 * Object-storage wrapper for pronunciation audio.
 *
 * One abstraction over two backends, selected by config (no code change between
 * environments):
 *   - dev  : MinIO (S3-compatible) — `S3_ENDPOINT` set, path-style addressing.
 *   - prod : real AWS S3 — `S3_ENDPOINT` unset, served via CloudFront.
 *
 * Audio objects are immutable (content keyed by word+accent+voice), so they are
 * written once and cached forever; clients fetch them straight from
 * `PRONUNCIATION_CDN_BASE_URL`, never through the API.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  private readonly client: S3Client | null;
  private readonly bucket: string;
  /** Public base URL (CloudFront in prod, MinIO endpoint+bucket in dev). */
  private readonly publicBaseUrl: string;
  /** When true, grant anonymous GetObject on the bucket (dev/MinIO). In prod a
   *  private bucket fronted by CloudFront is preferred, so default is false. */
  private readonly publicRead: boolean;

  constructor(config: ConfigService) {
    // Storage may use credentials distinct from Polly's: in local dev MinIO has
    // its own root creds while Polly needs real AWS creds. S3_* wins; falls back
    // to AWS_* (prod, where both are the same AWS account).
    const region =
      config.get<string>('S3_REGION') ?? config.get<string>('AWS_REGION');
    const accessKeyId =
      config.get<string>('S3_ACCESS_KEY_ID') ??
      config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey =
      config.get<string>('S3_SECRET_ACCESS_KEY') ??
      config.get<string>('AWS_SECRET_ACCESS_KEY');
    const endpoint = config.get<string>('S3_ENDPOINT'); // set → MinIO
    const forcePathStyle =
      config.get<string>('S3_FORCE_PATH_STYLE') === 'true' || !!endpoint;

    this.publicRead = config.get<string>('S3_PUBLIC_READ') === 'true';
    this.bucket = config.get<string>('S3_BUCKET') ?? 'learnenglish-audio';
    this.publicBaseUrl = (
      config.get<string>('PRONUNCIATION_CDN_BASE_URL') ??
      `${endpoint ?? ''}/${this.bucket}`
    ).replace(/\/+$/, '');

    if (region && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
        ...(endpoint ? { endpoint, forcePathStyle } : {}),
      });
      this.logger.log(
        `Object storage enabled (bucket "${this.bucket}"${endpoint ? `, endpoint ${endpoint}` : ''})`,
      );
    } else {
      this.client = null;
      this.logger.warn(
        'AWS credentials not set — object storage disabled (pronunciation audio cannot be persisted)',
      );
    }
  }

  /**
   * Creates the bucket on boot if missing. Real S3 buckets are usually
   * provisioned out-of-band, so a failure here is logged, not fatal — it lets
   * the app start in environments where the bucket already exists or creation
   * is denied. MinIO buckets are created on first run.
   */
  async onModuleInit(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Created bucket "${this.bucket}"`);
      } catch (err) {
        this.logger.warn(
          `Could not ensure bucket "${this.bucket}" exists: ${String(err)}`,
        );
      }
    }

    if (this.publicRead) {
      try {
        await this.client.send(
          new PutBucketPolicyCommand({
            Bucket: this.bucket,
            Policy: JSON.stringify({
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: '*',
                  Action: ['s3:GetObject'],
                  Resource: [`arn:aws:s3:::${this.bucket}/*`],
                },
              ],
            }),
          }),
        );
        this.logger.log(`Public-read policy applied to "${this.bucket}"`);
      } catch (err) {
        this.logger.warn(
          `Could not apply public-read policy to "${this.bucket}": ${String(err)}`,
        );
      }
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Uploads bytes under `key` and returns the public URL clients should use.
   * Objects are marked immutable + long-lived so the CDN/browser caches them.
   */
  async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    const client = this.client;
    if (!client) {
      throw new ServiceUnavailableException('Object storage not configured');
    }

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.logger.warn(`Upload failed for "${key}": ${String(err)}`);
      throw new ServiceUnavailableException('Object storage upload failed');
    }

    return { url: `${this.publicBaseUrl}/${key}`, key };
  }
}
