const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const card = await prisma.clinicalCard.upsert({
    where: { slug: "hengitysfunktio-astma-copd" },
    update: {},
    create: {
      slug: "hengitysfunktio-astma-copd",
      title: "Hengitysfunktio ja oireiden hallinta",
      subtitle: "Astman ja COPD:n diagnostiikka sekä seuranta",
      environment: "Terveysasema",
      audience: "Lääkärit",
      tags: ["Astma", "COPD", "Spirometria", "PEF"],
      isPublished: true,
      updatedByName: "System Seed",
    },
  });

  // Очистка старых данных перед наполнением
  await prisma.clinicalSection.deleteMany({ where: { cardId: card.id } });
  await prisma.clinicalField.deleteMany({ where: { cardId: card.id } });
  await prisma.clinicalRule.deleteMany({ where: { cardId: card.id } });

  // 1. Поля ввода (Параметры пациента)
  await prisma.clinicalField.createMany({
    data: [
      { cardId: card.id, key: "f_fev1_fvc", label: "FEV1/FVC (z-arvo)", type: "number", unit: "z", order: 10, isUniversal: true },
      { cardId: card.id, key: "f_pef_var", label: "PEF-vaihtelu (2 vk)", type: "number", unit: "%", order: 20, isUniversal: false },
      { cardId: card.id, key: "f_act_score", label: "Astmatesti (ACT)", type: "number", unit: "pist", order: 30, isUniversal: false },
      { cardId: card.id, key: "f_cat_score", label: "CAT-pisteet (COPD)", type: "number", unit: "pist", order: 40, isUniversal: false },
      { cardId: card.id, key: "f_smoke", label: "Tupakointi", type: "select", options: ["ei", "kyllä"], order: 50, isUniversal: true },
      { cardId: card.id, key: "f_eos", label: "B-Eos (Eosinofiilit)", type: "number", unit: "x10⁹/l", order: 60, isUniversal: true },
    ],
  });

  // 2. Секции контента (Инструкции)
  await prisma.clinicalSection.createMany({
    data: [
      {
        cardId: card.id,
        key: "s_diag",
        title: "Diagnostiikka (Spirometria & PEF)",
        order: 10,
        content: 
          "### Obstruktion kriteerit\n" +
          "- **COPD**: Post-BD FEV1/FVC < -1.65 z-arvoa.\n" +
          "- **Astma (BD-vaste)**: FEV1 tai FVC kasvaa ≥ 12 % ja ≥ 200 ml.\n\n" +
          "### PEF-seuranta (2 vk)\n" +
          "- Diagnostinen vaihtelu ≥ 20 % tai BD-vaste ≥ 15 % (≥ 3 krt/2 vk).\n" +
          "- **Oikea tekniikka**: Seisten, max sisäänhengitys, 3 yritystä, paras kirjataan.",
      },
      {
        cardId: card.id,
        key: "s_astma_mgmt",
        title: "Astman hallinta (GINA)",
        order: 20,
        content: 
          "### Oirehallinta (ACT)\n" +
          "- **Hyvä hallinta**: 20-25 pistettä. Jatka nykyistä hoitoa.\n" +
          "- **Huono hallinta**: < 20 pistettä. Tarkista tekniikka ja harkitse lääkityksen nostoa.\n\n" +
          "### Lääkehoito (MART-malli)\n" +
          "- Suositeltu (Track 1): ICS-formoteroli tarvittaessa + ylläpitona.\n" +
          "- Säännöllinen ICS on hoidon perusta.",
      },
      {
        cardId: card.id,
        key: "s_copd_mgmt",
        title: "COPD:n hoidon aloitus (GOLD)",
        order: 30,
        content: 
          "### Aloitusprofiili\n" +
          "- **Ryhmä A** (vähän oireita): Mikä tahansa bronkodilaattori.\n" +
          "- **Ryhmä B** (paljon oireita): LABA + LAMA.\n" +
          "- **Ryhmä E** (pahenemisvaiheet): LABA + LAMA. Lisää ICS, jos Eos ≥ 0.30.",
      },
      {
        cardId: card.id,
        key: "s_life",
        title: "Elintavat ja rokotukset",
        order: 40,
        content: 
          "### Rokotukset\n" +
          "- Influenssa, COVID-19, Pneumokokki.\n\n" +
          "### Tupakointi ja paino\n" +
          "- Tupakoinnin lopettaminen on hoidon perusta.\n" +
          "- Obeeseilla 5-10 % painonlasku parantaa hallintaa.",
      },
    ],
  });

  // 3. Динамические правила (Rules)
  await prisma.clinicalRule.createMany({
    data: [
      { cardId: card.id, fieldKey: "f_fev1_fvc", operator: "lt", value: "-1.65", highlightSectionKey: "s_diag", addHint: "Obstruktiivinen löydös havaittu (z < -1.65).", priority: 20 },
      { cardId: card.id, fieldKey: "f_pef_var", operator: "gte", value: "20", highlightSectionKey: "s_diag", addHint: "Astmalle tyypillinen PEF-vaihtelu (≥ 20%).", priority: 40 },
      { cardId: card.id, fieldKey: "f_act_score", operator: "lt", value: "20", highlightSectionKey: "s_astma_mgmt", addHint: "Astma ei ole hallinnassa. Tehosta hoitoa.", priority: 40 },
      { cardId: card.id, fieldKey: "f_cat_score", operator: "gte", value: "10", highlightSectionKey: "s_copd_mgmt", addHint: "CAT ≥ 10: Oireinen COPD. Harkitse kaksoisavaavaa (LABA+LAMA).", priority: 50 },
      { cardId: card.id, fieldKey: "f_smoke", operator: "eq", value: "kyllä", highlightSectionKey: "s_life", addHint: "Huom! Tupakointi heikentää ICS-vastetta ja pahentaa COPD:tä.", priority: 20 },
      { cardId: card.id, fieldKey: "f_eos", operator: "gte", value: "0.3", highlightSectionKey: "s_copd_mgmt", addHint: "Eosinofiilit ≥ 0.30: ICS hyödyllinen COPD:n pahenemisvaiheiden ehkäisyssä.", priority: 50 },
    ],
  });

  console.log("Seed OK: Hengitysfunktio-kortti luotu.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
