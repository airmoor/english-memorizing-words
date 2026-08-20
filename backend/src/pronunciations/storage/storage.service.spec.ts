import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { StorageService } from './storage.service';

/** Minimal ConfigService stand-in: only get() is used by the service. */
function configOf(env: Record<string, string>): ConfigService {
  return { get: (key: string) => env[key] } as unknown as ConfigService;
}

describe('StorageService (local filesystem backend)', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lexis-audio-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  function service(extra: Record<string, string> = {}) {
    return new StorageService(
      configOf({
        PRONUNCIATION_STORAGE_DIR: dir,
        PRONUNCIATION_CDN_BASE_URL: 'https://dev.lexly.club/audio',
        ...extra,
      }),
    );
  }

  it('reports itself available without any AWS credentials', () => {
    expect(service().isAvailable()).toBe(true);
  });

  it('writes the bytes to disk and returns the public URL', async () => {
    const svc = service();
    await svc.onModuleInit();

    const body = Buffer.from('id3-ish audio bytes');
    const result = await svc.put('us/hello-abc123.mp3', body, 'audio/mpeg');

    expect(result).toEqual({
      url: 'https://dev.lexly.club/audio/us/hello-abc123.mp3',
      key: 'us/hello-abc123.mp3',
    });
    await expect(
      fs.readFile(path.join(dir, 'us/hello-abc123.mp3')),
    ).resolves.toEqual(body);
  });

  it('leaves no temp files behind after a successful write', async () => {
    const svc = service();
    await svc.onModuleInit();
    await svc.put('uk/word.mp3', Buffer.from('x'), 'audio/mpeg');

    const entries = await fs.readdir(path.join(dir, 'uk'));
    expect(entries).toEqual(['word.mp3']);
  });

  it('rejects a key that escapes the audio directory', async () => {
    const svc = service();
    await svc.onModuleInit();

    await expect(
      svc.put('../escaped.mp3', Buffer.from('x'), 'audio/mpeg'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    // The traversal target must not exist — rejection has to happen before any
    // write, not be cleaned up afterwards.
    await expect(
      fs.stat(path.join(path.dirname(dir), 'escaped.mp3')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects a sibling directory that merely shares the prefix', async () => {
    const svc = service();
    await svc.onModuleInit();

    await expect(
      svc.put(`../${path.basename(dir)}-evil/x.mp3`, Buffer.from('x'), 'audio/mpeg'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('takes precedence over S3 credentials that are still in the environment', () => {
    const svc = service({
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'key',
      S3_SECRET_ACCESS_KEY: 'secret',
      S3_ENDPOINT: 'http://minio:9000',
    });
    // No S3 client is built, so a stale MinIO endpoint cannot silently win.
    expect(svc.isAvailable()).toBe(true);
    expect((svc as unknown as { client: unknown }).client).toBeNull();
  });
});

describe('StorageService (disabled)', () => {
  it('is unavailable and refuses put() when nothing is configured', async () => {
    const svc = new StorageService(configOf({}));
    expect(svc.isAvailable()).toBe(false);
    await expect(
      svc.put('a.mp3', Buffer.from('x'), 'audio/mpeg'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
