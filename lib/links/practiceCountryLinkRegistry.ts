import { getLocalizedText, type LocalizedText, type UiLanguage } from "../i18n/config";
import type { PracticeCountryCode } from "../clinical/practice/practiceCountryRegistry";

export type PracticeCountryLinkCategory = {
  id: string;
  practiceCountry: PracticeCountryCode;
  name: LocalizedText;
  links: Array<{
    id: string;
    title: string;
    url: string;
    description: LocalizedText;
  }>;
};

const PRACTICE_COUNTRY_LINKS: Record<PracticeCountryCode, PracticeCountryLinkCategory[]> = {
  FI: [
    {
      id: "fi-clinical-guidelines",
      practiceCountry: "FI",
      name: {
        fi: "Kliiniset suositukset",
        ru: "Клинические рекомендации",
        en: "Clinical guidelines",
        de: "Klinische Leitlinien",
      },
      links: [
        {
          id: "fi-kaypahoito-link",
          title: "Käypä hoito",
          url: "https://www.kaypahoito.fi",
          description: {
            fi: "Suomalaiset kansalliset hoitosuositukset.",
            ru: "Финские национальные клинические рекомендации.",
            en: "Finnish national evidence-based clinical guidelines.",
            de: "Finnische nationale evidenzbasierte Leitlinien.",
          },
        },
        {
          id: "fi-terveyskirjasto-link",
          title: "Terveyskirjasto / Lääkärikirja Duodecim",
          url: "https://www.terveyskirjasto.fi",
          description: {
            fi: "Lääkärin viitetieto ja potilasohjeita samassa palvelussa.",
            ru: "Справочная медицинская база и пациентские материалы Duodecim.",
            en: "Clinical reference content and patient materials from Duodecim.",
            de: "Klinische Referenzinhalte und Patientenmaterialien von Duodecim.",
          },
        },
      ],
    },
    {
      id: "fi-authorities-and-drugs",
      practiceCountry: "FI",
      name: {
        fi: "Viranomaiset ja lääketieto",
        ru: "Ведомства и лекарственная информация",
        en: "Authorities and drug information",
        de: "Behörden und Arzneimittelinformation",
      },
      links: [
        {
          id: "fi-thl-link",
          title: "THL",
          url: "https://thl.fi",
          description: {
            fi: "THL:n ohjeet, rokotukset, infektiot ja seulonnat.",
            ru: "THL: инфекции, вакцинация, скрининги и общественное здравоохранение.",
            en: "THL guidance for infections, vaccines, screening, and public health.",
            de: "THL-Leitlinien zu Infektionen, Impfungen, Screening und Public Health.",
          },
        },
        {
          id: "fi-fimea-link",
          title: "Fimea",
          url: "https://www.fimea.fi",
          description: {
            fi: "Lääkevalmisteiden tiedot, valmisteyhteenvedot ja viranomaisohjeet.",
            ru: "Данные о препаратах, SPC и инструкции финского регулятора.",
            en: "Drug information, SPCs, and regulator guidance from Fimea.",
            de: "Arzneimittelinformationen, Fachinformationen und Hinweise der Behörde Fimea.",
          },
        },
      ],
    },
  ],
  RU: [
    {
      id: "ru-clinical-guidelines",
      practiceCountry: "RU",
      name: {
        fi: "Kliiniset suositukset",
        ru: "Клинические рекомендации",
        en: "Clinical guidelines",
        de: "Klinische Leitlinien",
      },
      links: [
        {
          id: "ru-minzdrav-link",
          title: "Минздрав РФ — рубрикатор клинических рекомендаций",
          url: "https://cr.minzdrav.gov.ru",
          description: {
            fi: "Venäjän kliinisten suositusten virallinen rubrikaattori.",
            ru: "Официальный рубрикатор клинических рекомендаций Минздрава РФ.",
            en: "Official Russian Ministry of Health clinical recommendations registry.",
            de: "Offizielles Register klinischer Empfehlungen des russischen Gesundheitsministeriums.",
          },
        },
        {
          id: "ru-rospotrebnadzor-link",
          title: "Роспотребнадзор",
          url: "https://www.rospotrebnadzor.ru",
          description: {
            fi: "Tartuntatauteihin ja väestön terveyteen liittyvät viranomaisohjeet.",
            ru: "Официальные материалы по эпидемиологии, санитарии и общественному здоровью.",
            en: "Official public health and epidemiology guidance.",
            de: "Offizielle Hinweise zu Epidemiologie, Hygiene und öffentlicher Gesundheit.",
          },
        },
      ],
    },
    {
      id: "ru-drug-information",
      practiceCountry: "RU",
      name: {
        fi: "Lääketieto",
        ru: "Лекарственная информация",
        en: "Drug information",
        de: "Arzneimittelinformation",
      },
      links: [
        {
          id: "ru-grls-link",
          title: "ГРЛС",
          url: "https://grls.rosminzdrav.ru",
          description: {
            fi: "Venäjän virallinen lääkerekisteri ja valmisteohjeet.",
            ru: "Государственный реестр лекарственных средств и официальные инструкции.",
            en: "State drug registry and official medication instructions.",
            de: "Staatliches Arzneimittelregister und offizielle Arzneimittelinformationen.",
          },
        },
      ],
    },
  ],
  DE: [
    {
      id: "de-clinical-guidelines",
      practiceCountry: "DE",
      name: {
        fi: "Kliiniset suositukset",
        ru: "Клинические рекомендации",
        en: "Clinical guidelines",
        de: "Klinische Leitlinien",
      },
      links: [
        {
          id: "de-awmf-link",
          title: "AWMF Leitlinienregister",
          url: "https://register.awmf.org/de/start",
          description: {
            fi: "Saksan AWMF:n virallinen lääketieteellisten suositusten rekisteri.",
            ru: "Официальный реестр медицинских рекомендаций AWMF Германии.",
            en: "Official German medical guideline register maintained by AWMF.",
            de: "Offizielles deutsches Leitlinienregister der AWMF.",
          },
        },
        {
          id: "de-rki-link",
          title: "Robert Koch-Institut (RKI)",
          url: "https://www.rki.de",
          description: {
            fi: "Saksan kansanterveysviranomainen: infektiot, epidemiologia ja ehkäisy.",
            ru: "Федеральный институт общественного здоровья Германии: инфекции, эпидемиология и профилактика.",
            en: "German federal public health authority for infection control, epidemiology, and prevention.",
            de: "Bundesinstitut fuer Infektionsschutz, Epidemiologie und Praevention.",
          },
        },
      ],
    },
    {
      id: "de-drug-information",
      practiceCountry: "DE",
      name: {
        fi: "Lääketieto",
        ru: "Лекарственная информация",
        en: "Drug information",
        de: "Arzneimittelinformation",
      },
      links: [
        {
          id: "de-bfarm-link",
          title: "BfArM / PharmNet.Bund",
          url: "https://www.bfarm.de/EN/Medicinal-products/_node.html",
          description: {
            fi: "Saksan viralliset lääke- ja valmistekohtaiset tiedot BfArM:lta ja PharmNet.Bundista.",
            ru: "Официальная информация по лекарствам и препаратам Германии от BfArM и PharmNet.Bund.",
            en: "Official German medicinal product information from BfArM and PharmNet.Bund.",
            de: "Offizielle deutsche Arzneimittelinformationen von BfArM und PharmNet.Bund.",
          },
        },
      ],
    },
  ],
};

export function getPracticeCountryLinkCategories(practiceCountry: PracticeCountryCode, language: UiLanguage) {
  return (PRACTICE_COUNTRY_LINKS[practiceCountry] || []).map((category, categoryIndex) => ({
    id: category.id,
    name: getLocalizedText(category.name, language),
    userId: null,
    source: "practice-country-default" as const,
    practiceCountry: category.practiceCountry,
    sortOrder: categoryIndex,
    links: category.links.map((link, linkIndex) => ({
      id: link.id,
      title: link.title,
      url: link.url,
      description: getLocalizedText(link.description, language),
      userId: null,
      source: "practice-country-default" as const,
      sortOrder: linkIndex,
    })),
  }));
}
