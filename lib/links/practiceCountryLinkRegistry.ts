import type { UiLanguage } from "../i18n/config";

export type PracticeCountryLinkCategory = {
  id: string;
  practiceCountry: "FI" | "RU";
  name: Record<UiLanguage, string>;
  links: Array<{
    id: string;
    title: string;
    url: string;
    description: Record<UiLanguage, string>;
  }>;
};

const PRACTICE_COUNTRY_LINKS: Record<"FI" | "RU", PracticeCountryLinkCategory[]> = {
  FI: [
    {
      id: "fi-clinical-guidelines",
      practiceCountry: "FI",
      name: {
        fi: "Kliiniset suositukset",
        ru: "Клинические рекомендации",
        en: "Clinical guidelines",
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
          },
        },
      ],
    },
  ],
};

export function getPracticeCountryLinkCategories(practiceCountry: "FI" | "RU", language: UiLanguage) {
  return (PRACTICE_COUNTRY_LINKS[practiceCountry] || []).map((category, categoryIndex) => ({
    id: category.id,
    name: category.name[language] || category.name.en,
    userId: null,
    source: "practice-country-default" as const,
    practiceCountry: category.practiceCountry,
    sortOrder: categoryIndex,
    links: category.links.map((link, linkIndex) => ({
      id: link.id,
      title: link.title,
      url: link.url,
      description: link.description[language] || link.description.en,
      userId: null,
      source: "practice-country-default" as const,
      sortOrder: linkIndex,
    })),
  }));
}
