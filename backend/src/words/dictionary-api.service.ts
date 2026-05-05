import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiEntry } from './normalize';

const DICTIONARY_BASE_URL =
  'https://api.dictionaryapi.dev/api/v2/entries/en';

@Injectable()
export class DictionaryApiService {
  async fetchWord(text: string): Promise<ApiEntry[]> {
    let response: Response;

    try {
      response = await fetch(`${DICTIONARY_BASE_URL}/${encodeURIComponent(text)}`);
    } catch {
      throw new ServiceUnavailableException('Dictionary API is unavailable');
    }

    if (response.status === 404) {
      throw new NotFoundException(`Word "${text}" not found`);
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Dictionary API returned an unexpected status: ${response.status}`,
      );
    }

    return response.json() as Promise<ApiEntry[]>;
  }
}
