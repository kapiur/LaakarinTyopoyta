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
      attributeNamePrefix: "@_",
      // Важно для списков упаковок и веществ
      isArray: (name) => ["Laakevalmiste", "Laakeaine", "Pakkaus"].includes(name)
    });
    
    const jsonObj = parser.parse(xmlData);
    const root = jsonObj.Perusrekisteri;

    if (!root) throw new Error("XML-rakenne on virheellinen: Perusrekisteri-elementtiä ei löydy");

    // 1. СИНХРОНИЗАЦИЯ ВЕЩЕСТВ (Substance) + Lääke75+
    console.log("Päivitetään vaikuttavat aineet (Lääke75+)...");
    const aineet = root.Laakeaine || [];
    for (const aine of aineet) {
      const vAine = aine.VaikuttavaAine;
      const substanceName = vAine.Aine["@_value"].toLowerCase();

      await prisma.substance.upsert({
        where: { id: substanceName },
        update: {
          laake75Class: vAine.Laake75?.Luokka?.["@_id"],
          laake75Comment: vAine.Laake75?.KommenttiFI,
        },
        create: {
          id: substanceName,
          laake75Class: vAine.Laake75?.Luokka?.["@_id"],
          laake75Comment: vAine.Laake75?.KommenttiFI,
          communityNotes: "" // Сохраняем пустое при создании
        }
      });
    }

    // 2. СИНХРОНИЗАЦИЯ ПРЕПАРАТОВ (Medicine)
    console.log("Päivitetään lääkevalmisteet...");
    const valmisteet = root.Laakevalmiste || [];
    for (const v of valmisteet) {
      const substanceId = v["ATC-koodi"]?.["@_value"]?.toLowerCase() || 'tuntematon';
      
      await prisma.medicine.upsert({
        where: { id: v["@_id"] },
        update: {
          name: v.Kauppanimi,
          atcCode: v["ATC-koodi"]?.["@_id"],
          isPediatric: v.Lastenlaake === '1',
          prescriptionTerm: v.Maaraamisehto?.["@_value"] || null,
          status: v.Myyntilupa?.Tila?.["@_value"],
          isBiosimilar: v.Biosimilaari === '1',
          substanceId: substanceId
        },
        create: {
          id: v["@_id"],
          name: v.Kauppanimi,
          substanceId: substanceId,
          isPediatric: v.Lastenlaake === '1',
          isBiosimilar: v.Biosimilaari === '1',
          prescriptionTerm: v.Maaraamisehto?.["@_value"] || null,
        }
      });
    }

    // 3. СИНХРОНИЗАЦИЯ УПАКОВОК (Package)
    console.log("Päivitetään pakkaukset...");
    const pakkaukset = root.Pakkaus || [];
    for (const p of pakkaukset) {
      await prisma.package.upsert({
        where: { vnr: p["VNR-numero"]?.toString() },
        update: {
          isAvailable: p.Kaupanolo?.Kaupan === '1',
          sizeText: p.Pakkauskokoteksti
        },
        create: {
          vnr: p["VNR-numero"]?.toString(),
          medicineId: p["@_Laakevalmiste-ref"],
          sizeText: p.Pakkauskokoteksti,
          isAvailable: p.Kaupanolo?.Kaupan === '1'
        }
      });
    }

    console.log("✅ Tietokanta on nyt synkronoitu Fimean kanssa!");
  } catch (error) {
    console.error("!!! Virhe !!!", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
