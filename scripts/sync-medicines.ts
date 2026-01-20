import { PrismaClient } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const prisma = new PrismaClient();
const FIMEA_URL = 'https://data.pilvi.fimea.fi/avoin-data/Perusrekisteri.xml';

async function syncFimeaMedicines() {
  console.log("--- Aloitetaan lääketietokannan päivitys ---");
  console.log("Ladataan tietoja Fimeasta...");

  try {
    // 1. Загрузка данных
    const response = await fetch(FIMEA_URL);
    if (!response.ok) throw new Error(`Lataus epäonnistui: ${response.statusText}`);
    
    const xmlData = await response.text();
    console.log("Tiedosto ladattu. Jäsennellään...");

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const jsonObj = parser.parse(xmlData);
    const products = jsonObj.Perusrekisteri?.Valmisteet?.Valmiste;

    if (!Array.isArray(products)) {
      throw new Error("XML-rakenne on virheellinen tai tiedot puuttuvat");
    }

    console.log(`Löydetty ${products.length} valmistetta. Tallennetaan...`);

    // 2. Обработка данных в цикле
    for (const p of products) {
      // Подготовка идентификаторов
      const substanceId = p.VaikuttavatAineet?.VaikuttavaAine?.trim().toLowerCase() || 'tuntematon';
      const productId = p.ValmisteID?.toString();
      const vnr = p.VNR?.toString();

      if (!productId || !vnr) continue;

      try {
        // УРОВЕНЬ 1: Вещество (Substance)
        // Мы НЕ обновляем communityNotes, чтобы сохранить ваши Wiki-заметки
        await prisma.substance.upsert({
          where: { id: substanceId },
          update: {
            isBiological: p.Biologinen === '1',
          },
          create: {
            id: substanceId,
            communityNotes: "", 
            isBiological: p.Biologinen === '1'
          }
        });

        // УРОВЕНЬ 2: Препарат (Medicine)
        // Здесь мы используем productId как уникальный ключ
        await prisma.medicine.upsert({
          where: { id: productId },
          update: {
            name: p.Kauppanimi,
            atcCode: p.ATCkoodi,
            isPediatric: p.Lastenlaake === '1',
            prescriptionTerm: p.Maaraamisehto,
            status: p.Tila,
            isBiosimilar: p.Biosimilaari === '1',
            substanceId: substanceId // Привязка к веществу
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

        // УРОВЕНЬ 3: Упаковка (Package)
        // Здесь ключом является vnr
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
            medicineId: productId, // Привязка к бренду
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
        console.error(`Virhe tuotteen ${vnr} kohdalla:`, e);
      }
    }

    console.log("✅ Tietokanta on nyt synkronoitu Fimean kanssa!");
  } catch (error) {
    console.error("!!! Virhe !!!");
    console.error("Syy:", error);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
