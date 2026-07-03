export type Icd10Entry = {
  code: string;
  fi: string;
  en: string;
  ru: string;
  de: string;
};

export const ICD10_CATALOG: Icd10Entry[] = [
  { code: "I10", fi: "Essentiaalinen verenpainetauti", en: "Essential hypertension", ru: "Эссенциальная гипертензия", de: "Essentielle Hypertonie" },
  { code: "E11", fi: "Tyypin 2 diabetes", en: "Type 2 diabetes mellitus", ru: "Сахарный диабет 2 типа", de: "Diabetes mellitus Typ 2" },
  { code: "E10", fi: "Tyypin 1 diabetes", en: "Type 1 diabetes mellitus", ru: "Сахарный диабет 1 типа", de: "Diabetes mellitus Typ 1" },
  { code: "E66", fi: "Lihavuus", en: "Obesity", ru: "Ожирение", de: "Adipositas" },
  { code: "M54.5", fi: "Alaselkan kipu", en: "Low back pain", ru: "Боль в пояснице", de: "Kreuzschmerz" },
  { code: "M17", fi: "Polven nivelrikko", en: "Knee osteoarthritis", ru: "Остеоартроз коленного сустава", de: "Gonarthrose" },
  { code: "M16", fi: "Lonkan nivelrikko", en: "Hip osteoarthritis", ru: "Остеоартроз тазобедренного сустава", de: "Koxarthrose" },
  { code: "F32", fi: "Masennustila", en: "Depressive episode", ru: "Депрессивный эпизод", de: "Depressive Episode" },
  { code: "F33", fi: "Toistuva masennus", en: "Recurrent depressive disorder", ru: "Рекуррентное депрессивное расстройство", de: "Rezidivierende Depression" },
  { code: "F41.1", fi: "Yleistynyt ahdistuneisuushairio", en: "Generalized anxiety disorder", ru: "Генерализованное тревожное расстройство", de: "Generalisierte Angststoerung" },
  { code: "J06.9", fi: "Yla hengitystieinfektio", en: "Upper respiratory tract infection", ru: "Инфекция верхних дыхательных путей", de: "Infektion der oberen Atemwege" },
  { code: "J20.9", fi: "Akuutti bronkiitti", en: "Acute bronchitis", ru: "Острый бронхит", de: "Akute Bronchitis" },
  { code: "J45", fi: "Astma", en: "Asthma", ru: "Астма", de: "Asthma" },
  { code: "J44", fi: "Keuhkoahtaumatauti", en: "COPD", ru: "ХОБЛ", de: "COPD" },
  { code: "R07.4", fi: "Rintakipu, maarittamaton", en: "Chest pain, unspecified", ru: "Боль в груди неуточненная", de: "Thoraxschmerz, nicht naeher bezeichnet" },
  { code: "R06.0", fi: "Hengenahdistus", en: "Dyspnea", ru: "Одышка", de: "Dyspnoe" },
  { code: "G43", fi: "Migreeni", en: "Migraine", ru: "Мигрень", de: "Migraene" },
  { code: "G44.2", fi: "Jannityspaansarky", en: "Tension-type headache", ru: "Головная боль напряжения", de: "Spannungskopfschmerz" },
  { code: "N39.0", fi: "Virtsatieinfektio", en: "Urinary tract infection", ru: "Инфекция мочевых путей", de: "Harnwegsinfektion" },
  { code: "R35", fi: "Tihentynyt virtsaaminen", en: "Polyuria or frequency of micturition", ru: "Учащенное мочеиспускание", de: "Hauefiges Wasserlassen" },
  { code: "K21.9", fi: "Refluksitauti", en: "Gastro-esophageal reflux disease", ru: "ГЭРБ", de: "Refluxkrankheit" },
  { code: "K29.7", fi: "Gastriitti", en: "Gastritis", ru: "Гастрит", de: "Gastritis" },
  { code: "K58", fi: "Airtyvan suolen oireyhtyma", en: "Irritable bowel syndrome", ru: "Синдром раздраженного кишечника", de: "Reizdarmsyndrom" },
  { code: "R10.4", fi: "Vatsakipu, muu ja maarittamaton", en: "Other and unspecified abdominal pain", ru: "Боль в животе неуточненная", de: "Bauchschmerz, nicht naeher bezeichnet" },
  { code: "B34.9", fi: "Virusinfektio, maarittamaton", en: "Viral infection, unspecified", ru: "Вирусная инфекция неуточненная", de: "Virusinfektion, nicht naeher bezeichnet" },
  { code: "U07.1", fi: "COVID-19", en: "COVID-19", ru: "COVID-19", de: "COVID-19" },
  { code: "M75.1", fi: "Kiertajakalvosinoireyhtyma", en: "Rotator cuff syndrome", ru: "Синдром вращательной манжеты плеча", de: "Rotatorenmanschettensyndrom" },
  { code: "M77.1", fi: "Tenniskaeynaerpaa", en: "Lateral epicondylitis", ru: "Латеральный эпикондилит", de: "Laterale Epicondylitis" },
  { code: "S93.4", fi: "Nilkan nyrjahdys", en: "Sprain of ankle", ru: "Растяжение связок голеностопа", de: "Verstauchung des Sprunggelenks" },
  { code: "S83.4", fi: "Polven nyrjahdys", en: "Sprain of knee", ru: "Растяжение связок колена", de: "Verstauchung des Knies" },
  { code: "T14.9", fi: "Vamma, maarittamaton", en: "Injury, unspecified", ru: "Травма неуточненная", de: "Verletzung, nicht naeher bezeichnet" },
  { code: "R53", fi: "Huonovointisuus ja vaesymys", en: "Malaise and fatigue", ru: "Недомогание и утомляемость", de: "Unwohlsein und Ermuedung" },
  { code: "G56.0", fi: "Rannekanavaoireyhtyma", en: "Carpal tunnel syndrome", ru: "Синдром запястного канала", de: "Karpaltunnelsyndrom" },
  { code: "M79.6", fi: "Raajakipu", en: "Pain in limb", ru: "Боль в конечности", de: "Schmerz in Extremitaet" },
  { code: "Z54.0", fi: "Toipuminen leikkauksen jalkeen", en: "Convalescence after surgery", ru: "Восстановление после операции", de: "Rekonvaleszenz nach Operation" },
  { code: "Z73.0", fi: "Loppuunpalaminen", en: "Burn-out", ru: "Эмоциональное выгорание", de: "Burn-out" },
];

export function searchIcd10Catalog(query: string, limit = 12): Icd10Entry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return ICD10_CATALOG.slice(0, limit);

  return ICD10_CATALOG.map((entry) => {
    const haystack = [entry.code, entry.fi, entry.en, entry.ru, entry.de].join(" ").toLowerCase();
    let score = 0;

    if (entry.code.toLowerCase() === normalized) score += 100;
    if (entry.code.toLowerCase().startsWith(normalized)) score += 70;
    if (entry.fi.toLowerCase().includes(normalized)) score += 50;
    if (entry.en.toLowerCase().includes(normalized)) score += 40;
    if (entry.ru.toLowerCase().includes(normalized)) score += 40;
    if (entry.de.toLowerCase().includes(normalized)) score += 40;
    if (haystack.includes(normalized)) score += 20;

    return { entry, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.code.localeCompare(b.entry.code, "fi"))
    .slice(0, limit)
    .map((item) => item.entry);
}
