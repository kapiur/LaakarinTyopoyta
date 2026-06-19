import { privacyPackDe } from './de';
import { privacyPackEn } from './en';
import { privacyPackFi } from './fi';
import { privacyPackRu } from './ru';
import type { PrivacyLocaleKey, PrivacyLocalePack } from './types';

export type { PrivacyLocaleKey, PrivacyLocalePack } from './types';

export const DEFAULT_PRIVACY_LOCALE_KEYS: PrivacyLocaleKey[] = ['fi', 'ru', 'en', 'de'];

const PRIVACY_PACKS: Record<PrivacyLocaleKey, PrivacyLocalePack> = {
  fi: privacyPackFi,
  ru: privacyPackRu,
  en: privacyPackEn,
  de: privacyPackDe,
};

export function resolvePrivacyLocalePacks(localeKeys?: PrivacyLocaleKey[]) {
  const keys = Array.isArray(localeKeys) && localeKeys.length > 0
    ? localeKeys
    : DEFAULT_PRIVACY_LOCALE_KEYS;

  return keys
    .map((key) => PRIVACY_PACKS[key])
    .filter((pack): pack is PrivacyLocalePack => Boolean(pack));
}
