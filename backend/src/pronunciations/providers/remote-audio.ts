import { Logger } from '@nestjs/common';
import { ProviderUnreachableError } from './provider.interface';
import type { PronunciationProvider } from './provider.interface';

/**
 * Downloads an audio file that an external dictionary points us at.
 *
 * Dictionary providers hand back a URL, not bytes — but the rest of the
 * pipeline (hash → object storage → DB row) is byte-oriented, and we do not
 * want to hotlink someone else's CDN on every card review. So we fetch once,
 * store the bytes ourselves, and never touch the origin again.
 *
 * SECURITY — these URLs are attacker-influenced. `phonetics[].audio` is an
 * arbitrary string lifted out of a third party's JSON, so fetching it verbatim
 * would be a server-side request forgery primitive: a compromised (or
 * DNS-hijacked) upstream could aim us at http://169.254.169.254/ for cloud
 * credentials, or at internal services like MinIO and Postgres that are
 * unreachable from the internet but wide open from inside the network.
 *
 * Defense is an allow-list of the exact hosts our providers legitimately use,
 * enforced twice: once on the URL we were given, and again on `response.url`
 * after redirects — otherwise an allowed host could 302 us anywhere.
 *
 * Failure handling distinguishes two kinds of "no bytes":
 *   - returns null — the request completed and the answer is simply not usable
 *     audio (404, wrong content-type, empty body, disallowed URL). A stable
 *     fact, safe to cache.
 *   - throws ProviderUnreachableError — the host could not be reached (network
 *     error, timeout, 5xx). Transient, must NOT be cached as "no pronunciation".
 */

const FETCH_TIMEOUT_MS = 8_000;
/** Single-word recordings are a few dozen KB; 5 MB is a generous ceiling that
 *  still stops us from buffering something unexpected into memory. */
const MAX_BYTES = 5 * 1024 * 1024;

const ACCEPTED_CONTENT_TYPES = ['audio/', 'application/octet-stream'];

/**
 * Hosts our pronunciation providers are allowed to download from. Adding a
 * provider means adding its media host here — deliberately a chore, so that
 * widening the server's reach is always a conscious decision.
 *
 * `upload.wikimedia.org` is listed for a future provider that reads Commons
 * directly; Free Dictionary currently proxies those files itself.
 */
export const ALLOWED_AUDIO_HOSTS: ReadonlySet<string> = new Set([
  'api.dictionaryapi.dev',
  'media.merriam-webster.com',
  'upload.wikimedia.org',
]);

/**
 * True when `raw` is an https URL pointing at an allow-listed host.
 *
 * https is required, not merely preferred: plain http would let anyone on the
 * path swap the bytes we are about to store permanently, and it also rules out
 * the http-only link-local metadata endpoints in one stroke.
 *
 * Exported for unit testing.
 */
export function isAllowedAudioUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && ALLOWED_AUDIO_HOSTS.has(url.hostname);
}

export interface RemoteAudio {
  audio: Buffer;
  contentType: string;
}

export async function fetchRemoteAudio(
  url: string,
  logger: Logger,
  provider: PronunciationProvider,
): Promise<RemoteAudio | null> {
  if (!isAllowedAudioUrl(url)) {
    logger.warn(`Refusing to fetch audio from disallowed URL: ${url}`);
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    // Network error or our own timeout — transient by nature.
    throw new ProviderUnreachableError(
      provider,
      `audio fetch failed for ${url}: ${String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  // Re-check after redirects: fetch follows them transparently, so the response
  // may well come from a host we never approved.
  if (!isAllowedAudioUrl(response.url)) {
    logger.warn(`Audio request redirected to disallowed URL: ${response.url}`);
    return null;
  }

  if (!response.ok) {
    // 5xx and 429 say "ask again later"; 4xx says "this file is not there".
    if (response.status >= 500 || response.status === 429) {
      throw new ProviderUnreachableError(
        provider,
        `audio host returned ${response.status} for ${url}`,
      );
    }
    logger.warn(`Audio fetch returned ${response.status} for ${url}`);
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!ACCEPTED_CONTENT_TYPES.some((prefix) => contentType.startsWith(prefix))) {
    logger.warn(`Unexpected content-type "${contentType}" for ${url}`);
    return null;
  }

  // Trust-but-verify: the advertised length is a cheap early reject, and the
  // post-read check catches hosts that lie or omit the header.
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
    logger.warn(`Audio too large (${declaredLength} bytes) at ${url}`);
    return null;
  }

  const audio = Buffer.from(await response.arrayBuffer());

  if (audio.length === 0) {
    logger.warn(`Empty audio body at ${url}`);
    return null;
  }
  if (audio.length > MAX_BYTES) {
    logger.warn(`Audio too large (${audio.length} bytes) at ${url}`);
    return null;
  }

  return {
    audio,
    // Normalize octet-stream: every source we support serves MP3.
    contentType: contentType.startsWith('audio/') ? contentType : 'audio/mpeg',
  };
}
