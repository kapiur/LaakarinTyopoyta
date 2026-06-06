import type { PrivacyLocalePack } from './types';

export const privacyPackRu: PrivacyLocalePack = {
  locale: 'ru',
  personContextWords: [
    'пациент',
    'пациента',
    'имя',
    'дата рождения',
    'д\\.р\\.',
    'почта',
    'телефон',
    'тел\\.',
    'адрес',
    'муж',
    'жена',
    'мальчик',
    'девочка',
    'ребенок',
    'мать',
    'отец',
    'родственник',
    'опекун',
  ],
  dateOfBirthLabels: ['дата рождения', 'д\\.р\\.'],
  explicitNameLabels: ['пациент', 'имя'],
  patientIdLabels: ['номер пациента', 'id пациента', 'номер карты'],
  notes: 'Russian privacy pack for imported or mixed-language notes.',
};
