/**
 * Vendor DTOs for the Merriam-Webster Learner's Dictionary API.
 * Reference: https://dictionaryapi.com/products/api-learners-dictionary
 *
 * These types describe the wire format only. They MUST NOT leak outside this directory.
 */

export interface MwSound {
  audio: string;
  ref?: string;
}

export interface MwPronunciation {
  ipa?: string;
  mw?: string;
  sound?: MwSound;
  l?: string;
}

export interface MwHeadwordInfo {
  hw: string;
  prs?: MwPronunciation[];
}

export interface MwVis {
  t: string;
  aq?: unknown;
}

export type MwDtItem =
  | ['text', string]
  | ['vis', MwVis[]]
  | ['sdsense', MwSdsense]
  | [string, unknown];

export interface MwSdsense {
  sd: string;
  dt: MwDtItem[];
}

export interface MwSenseContent {
  sn?: string;
  sls?: string[];
  dt?: MwDtItem[];
  sdsense?: MwSdsense;
}

export type MwSseqItem =
  | ['sense', MwSenseContent]
  | ['bs', { sense: MwSenseContent }]
  | ['pseq', MwSseqItem[]]
  | [string, unknown];

export interface MwDefSection {
  vd?: string;
  sseq: MwSseqItem[][];
}

export interface MwEntry {
  meta: {
    id: string;
    uuid: string;
    src: string;
    offensive: boolean;
    stems?: string[];
  };
  hwi: MwHeadwordInfo;
  fl?: string;
  def?: MwDefSection[];
  shortdef?: string[];
  hom?: number;
}

/** MW response is `MwEntry[]` on hit, `string[]` ("did you mean…") on miss. */
export type MwResponse = MwEntry[] | string[];
