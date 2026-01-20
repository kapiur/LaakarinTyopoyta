import { PrismaClient } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const prisma = new PrismaClient();
const FIMEA_URL = 'https://data.pilvi.fimea.fi/avoin-data/Perusrekisteri.xml';

async function syncFimeaMedicines() {
  console.log("🚀 Aloitetaan lääketietojen synkronointi Fimean palvelimelta...");

  try {
    // 1. Получаем данные напрямую с сервера
    const response = await fetch(FIMEA_URL);
    const xmlData = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const jsonObj = parser.parse(xmlData);
    
    // Путь к списку препаратов в XML (Perusrekisteri -> Valmisteet -> Valmiste)
    const products = jsonObj.Perusrekisteri?.Valmisteet?.Valmiste;

    if (!Array.isArray(products)) {
      throw new Error("XML-rakenne on virheellinen tai tiedot puuttuvat");
    }

    console.log(`📦 Löydetty ${products.length} pakkausta. Päivitetään tietokanta...`);

    for (const p of products) {
      // Подготовка данных
      const substanceId = p.VaikuttavatAineet?.VaikuttavaAine?.trim().toLowerCase() || 'tuntematon';
      const productId = p.ValmisteID?.toString();
      const vnr = p.VNR?.toString();

      if (!productId || !vnr) continue;

      // ШАГ 1: Обновляем Вещество (Substance) — УРОВЕНЬ 1
      // Используем upsert, чтобы НЕ затирать communityNotes и gfrGuidelines
      await prisma.substance.upsert({
        where: { id: substanceId },
        update: {
          isBiological: p.Biologinen === '1',
        },
        create: {
          id: substanceId,
          communityNotes: "", // Оставляем пустым для будущих Wiki-заметок
          isBiological: p.Biologinen === '1'
        }
      });

      // ШАГ 2: Обновляем Препарат (Medicine) — УРОВЕНЬ 2
      await prisma.medicine.upsert({
        where: { id: productId },
        update: {
          name: p.Kauppanimi,
          atcCode: p.ATCkoodi,
          isPediatric: p.Lastenlaake === '1', // Флаг для калькулятора PEDS
          prescriptionTerm: p.Maaraamisehto, // Особые условия выписки
          status: p.Tila,
          isBiosimilar: p.Biosimilaari === '1'
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

      // ШАГ 3: Обновляем Упаковку (Package) — УРОВЕНЬ 3
      await prisma.package.upsert({
        where: { vnr: vnr },
        update: {
          sizeText: p.Pakkauskoko,
          strength: p.Vahvuus,
          form: p.Laakemuoto,
          container: p.Sailytysastia,
          isAvailable: p.Kaupan === '1', // Статус наличия в аптеках
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
    }

    console.log("✅ Tietokanta on nyt synkronoitu Fimean kanssa!");
  } catch (error) {
    console.error("❌ Synkronointivirhe:", error);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
