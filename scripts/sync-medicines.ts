const { PrismaClient } = require('@prisma/client');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();
const FIMEA_URL = 'https://data.pilvi.fimea.fi/avoin-data/Perusrekisteri.xml';

async function syncFimeaMedicines() {
  console.log("--- Aloitetaan lääketietokannan päivitys ---");
  
  try {
    const response = await fetch(FIMEA_URL);
    const xmlData = await response.text();
    console.log("Tiedosto ladattu. Jäsennellään...");

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const jsonObj = parser.parse(xmlData);
    
    // ОТЛАДКА: Посмотрим, какие ключи есть в корне
    const rootKey = Object.keys(jsonObj)[0];
    console.log("Root element name:", rootKey); 
    
    // Пытаемся найти массив продуктов по разным путям
    let products = jsonObj[rootKey]?.Valmisteet?.Valmiste || 
                   jsonObj[rootKey]?.Valmiste || 
                   jsonObj.Valmisteet?.Valmiste;

    if (!products) {
      console.log("DEBUG: XML structure keys:", Object.keys(jsonObj[rootKey] || {}));
      throw new Error("XML-rakenne on virheellinen или данные не найдены по ожидаемым путям");
    }

    // Если в XML всего один препарат, fast-xml-parser сделает его объектом, а не массивом
    if (!Array.isArray(products)) {
      products = [products];
    }

    console.log(`Löydetty ${products.length} valmistetta. Tallennetaan...`);

    for (const p of products) {
      const substanceId = p.VaikuttavatAineet?.VaikuttavaAine?.trim().toLowerCase() || 'tuntematon';
      const productId = p.ValmisteID?.toString();
      const vnr = p.VNR?.toString();

      if (!productId || !vnr) continue;

      try {
        await prisma.substance.upsert({
          where: { id: substanceId },
          update: { isBiological: p.Biologinen === '1' },
          create: { id: substanceId, communityNotes: "", isBiological: p.Biologinen === '1' }
        });

        await prisma.medicine.upsert({
          where: { id: productId },
          update: {
            name: p.Kauppanimi,
            atcCode: p.ATCkoodi,
            isPediatric: p.Lastenlaake === '1',
            prescriptionTerm: p.Maaraamisehto,
            status: p.Tila,
            isBiosimilar: p.Biosimilaari === '1',
            substanceId: substanceId
          },
          create: {
            id: productId,
            substanceId: substanceId,
            name: p.Kauppanimi,
            atcCode: p.ATCkoodi,
            isPediatric: p.Lastenlaake === '1',
            prescriptionTerm: p.Maaraamisehto,
            status: p.Tila,
            isBiosimilar: p.Biosimilaari === '1'
          }
        });

        await prisma.package.upsert({
          where: { vnr: vnr },
          update: {
            sizeText: p.Pakkauskoko,
            strength: p.Vahvuus,
            form: p.Laakemuoto,
            container: p.Sailytysastia,
            isAvailable: p.Kaupan === '1',
            dddValue: p.DDDArvo ? parseFloat(p.DDDArvo) : null,
            dddUnit: p.DDDYksikko
          },
          create: {
            vnr: vnr,
            medicineId: productId,
            sizeText: p.Pakkauskoko,
            strength: p.Vahvuus,
            form: p.Laakemuoto,
            container: p.Sailytysastia,
            isAvailable: p.Kaupan === '1',
            dddValue: p.DDDArvo ? parseFloat(p.DDDArvo) : null,
            dddUnit: p.DDDYksikko
          }
        });
      } catch (e) {
        // Пропускаем ошибки конкретных записей
      }
    }

    console.log("✅ Tietokanta on nyt synkronoitu Fimean kanssa!");
  } catch (error) {
    console.error("!!! Virhe !!!", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
