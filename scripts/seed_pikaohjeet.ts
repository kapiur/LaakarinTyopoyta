import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1) Card
  const card = await prisma.clinicalCard.upsert({
    where: { slug: "diabetes-2" },
    update: {
      title: "Diabetes 2",
      subtitle: "Pikaohje (terveysasema)",
      tags: ["diabetes", "T2D", "CKD", "RR", "albuminuria", "insuliini"],
      environment: "terveysasema",
      audience: "aikuinen",
      isPublished: true,
      updatedByName: "seed",
      updatedByEmail: null,
      updatedByUserId: null,
    },
    create: {
      slug: "diabetes-2",
      title: "Diabetes 2",
      subtitle: "Pikaohje (terveysasema)",
      tags: ["diabetes", "T2D", "CKD", "RR", "albuminuria", "insuliini"],
      environment: "terveysasema",
      audience: "aikuinen",
      isPublished: true,
      updatedByName: "seed",
      updatedByEmail: null,
      updatedByUserId: null,
    },
  });

  // 2) Replace child collections (simple MVP seed)
  await prisma.clinicalSection.deleteMany({ where: { cardId: card.id } });
  await prisma.clinicalField.deleteMany({ where: { cardId: card.id } });
  await prisma.clinicalRule.deleteMany({ where: { cardId: card.id } });

  // 3) Fields (patient context)
  const fields = [
    // universal-ish
    { key: "ika", label: "Ikä", type: "number", unit: "v", order: 10, isUniversal: true },
    { key: "rr_syst", label: "RR syst", type: "number", unit: "mmHg", order: 20, isUniversal: true },
    { key: "rr_diast", label: "RR diast", type: "number", unit: "mmHg", order: 30, isUniversal: true },
    { key: "dm2", label: "Diabetes", type: "select", options: ["ei", "T2"], order: 40, isUniversal: true },
    { key: "egfr", label: "eGFR", type: "number", unit: "ml/min/1.73m²", order: 50, isUniversal: true },

    // card-specific
    { key: "hba1c", label: "HbA1c", type: "number", unit: "mmol/mol", order: 110, isUniversal: false },
    { key: "albuminuria", label: "Albuminuria", type: "select", options: ["ei", "kyllä"], order: 120, isUniversal: false },
    { key: "ylipaino", label: "Ylipaino", type: "select", options: ["ei", "kyllä"], order: 130, isUniversal: false },
    { key: "injektiot", label: "Valmis injektioihin", type: "select", options: ["ei", "kyllä"], order: 140, isUniversal: false },
  ];

  await prisma.clinicalField.createMany({
    data: fields.map((f) => ({
      cardId: card.id,
      key: f.key,
      label: f.label,
      type: f.type,
      unit: (f as any).unit ?? null,
      placeholder: null,
      options: (f as any).options ?? [],
      order: f.order,
      isUniversal: f.isUniversal,
    })),
  });

  // 4) Sections (pikaohje content, markdown)
  const sections = [
    {
      key: "minimi",
      title: "Tarkista aina vastaanotolla",
      order: 10,
      content:
        "- HbA1c (tavoite yksilöllinen)\n- eGFR\n- RR\n- paino/BMI\n- U-Alb/Krea\n- lipidit\n- lääkitys + siedettävyys\n- motivaatio\n\nElintapahoito on aina perusta.",
      highlightCallout: null,
    },
    {
      key: "perus",
      title: "Ensimmäinen linja",
      order: 20,
      content:
        "Metformiini, jos ei vasta-aihetta. Titraa siedon mukaan kohti maksimiannosta. Jos GI-oireita: hitaampi titraus / depot.",
      highlightCallout: null,
    },
    {
      key: "tehostus",
      title: "HbA1c yli tavoitteen – tehostus",
      order: 30,
      content:
        "Valinta potilasprofiilin mukaan:\n\n- Ylipaino / CV-riski: SGLT2 (eGFR-rajojen mukaan)\n- Iäkäs/hauras: DPP-4\n- BMI > 30: GLP-1 (ei yhdessä DPP-4)\n\nJos tablettivaihtoehdot eivät riitä: harkitse insuliinia.",
      highlightCallout: "HbA1c yli tavoitteen – tehosta hoitoa ja sovi kontrolli.",
    },
    {
      key: "ckd",
      title: "CKD (eGFR) – annosrajat",
      order: 40,
      content:
        "eGFR < 60: huomioi annosrajoitukset.\n\n- Metformiini: annos alas\n- DPP-4: annoskorjaus\n- SGLT2: eGFR-rajojen mukaan\n- Insuliini: tarvittaessa",
      highlightCallout: "eGFR < 60 – tarkista annokset ja valinnat.",
    },
    {
      key: "rr",
      title: "RR ja albuminuria (aina rinnalla)",
      order: 50,
      content:
        "Albuminuriassa ACEi/AT2 maksimiin. Seuraa K ja krea.\n\nRR-tavoite yksilöllinen; albuminuriassa pyri tiukempaan tavoitteeseen.",
      highlightCallout: "Albuminuria/RR – ACEi/AT2 ja seuranta.",
    },
    {
      key: "insuliini",
      title: "Milloin insuliini",
      order: 60,
      content:
        "Harkitse, jos HbA1c pysyy korkeana ≥2–3 lääkkeellä tai oireinen hyperglykemia.\n\nAloitus: basaali 10 E/vrk, titraa +2–3 E / 2 vrk (paastosokeritavoite).",
      highlightCallout: "Tavoite ei täyty – harkitse basaali-insuliinia.",
    },
    {
      key: "kirjaus",
      title: "Kirjaa aina",
      order: 70,
      content:
        "HbA1c (nyt/tavoite), eGFR, RR, paino/BMI, lääkemuutos + perustelu, kontrolli 3–6 kk + labrat.",
      highlightCallout: null,
    },
  ];

  await prisma.clinicalSection.createMany({
    data: sections.map((s) => ({
      cardId: card.id,
      key: s.key,
      title: s.title,
      order: s.order,
      content: s.content,
      highlightCallout: s.highlightCallout,
    })),
  });

  // 5) Rules (highlights)
  const rules = [
    { fieldKey: "egfr", operator: "<", value: "60", highlightSectionKey: "ckd", addHint: "eGFR < 60: annosrajat ja valinnat.", priority: 10 },
    { fieldKey: "albuminuria", operator: "==", value: "kyllä", highlightSectionKey: "rr", addHint: "Albuminuria: ACEi/AT2 + seuranta.", priority: 20 },
    { fieldKey: "rr_syst", operator: ">=", value: "140", highlightSectionKey: "rr", addHint: "RR koholla: tehosta hoitoa ja kontrolli.", priority: 30 },
    { fieldKey: "hba1c", operator: ">=", value: "58", highlightSectionKey: "tehostus", addHint: "HbA1c yli tavoitteen: tehostusporras.", priority: 40 },
    { fieldKey: "injektiot", operator: "==", value: "kyllä", highlightSectionKey: "insuliini", addHint: "Valmis injektioihin: GLP-1/insuliini helpompi.", priority: 60 },
  ];

  await prisma.clinicalRule.createMany({
    data: rules.map((r) => ({
      cardId: card.id,
      fieldKey: r.fieldKey,
      operator: r.operator,
      value: r.value,
      highlightSectionKey: r.highlightSectionKey,
      addHint: r.addHint,
      priority: r.priority,
    })),
  });

  // 6) Revision log
  await prisma.clinicalRevision.create({
    data: {
      cardId: card.id,
      action: "seed_card",
      summary: "Seeded diabetes-2 card",
      editorName: "seed",
      payload: { slug: card.slug },
    },
  });

  console.log("Seed OK:", card.slug);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
