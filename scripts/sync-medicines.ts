const { PrismaClient } = require('@prisma/client');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();
const FIMEA_URL = 'https://data.pilvi.fimea.fi/avoin-data/Perusrekisteri.xml';

async function syncFimeaMedicines() {
  console.log("--- Aloitetaan lääketietokannan päivitys ---");
  
  try {
    const response = await fetch(FIMEA_URL);
    if (!response.ok) throw new Error(`Lataus epäonnistui: ${response.statusText}`);
    
    const xmlData = await response.text();
    console.log("Tiedosto ladattu. Jäsennellään...");

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => ["Laakevalmiste", "Laakeaine", "Pakkaus"].includes(name)
    });
    
    const jsonObj = parser.parse(xmlData);
    const root = jsonObj.Perusrekisteri;

    if (!root) throw new Error("XML-rakenne on virheellinen: Perusrekisteri-elementtiä ei löydy");

    // 1. СИНХРОНИЗАЦИЯ ВЕЩЕСТВ (Substance) + Lääke75+
    console.log("Päivitetään vaikuttavat aineet (Lääke75+)...");
    const aineet = root.Laakeaine || [];
    let substanceCount = 0;

    for (const aine of aineet) {
      // Защищенный доступ к названию вещества
      const substanceName = aine.VaikuttavaAine?.Aine?.["@_value"]?.toLowerCase();

      if (!substanceName) continue;

      try {
        await prisma.substance.upsert({
          where: { id: substanceName },
          update: {
            laake75Class: aine.VaikuttavaAine.Laake75?.Luokka?.["@_id"] || null,
            laake75Comment: aine.VaikuttavaAine.Laake75?.KommenttiFI || null,
          },
          create: {
            id: substanceName,
            laake75Class: aine.VaikuttavaAine.Laake75?.Luokka?.["@_id"] || null,
            laake75Comment: aine.VaikuttavaAine.Laake75?.KommenttiFI || null,
            communityNotes: "" // Инициализация, не затирает существующие при upsert update
          }
        });
        substanceCount++;
      } catch (dbError) {
        console.warn(`⚠️ Virhe aineen ${substanceName} kohdalla:`, dbError.message);
      }
    }
    console.log(`Käsitelty ${substanceCount} ainetta.`);

    // 2. СИНХРОНИЗАЦИЯ ПРЕПАРАТОВ (Medicine)
    console.log("Päivitetään lääkevalmisteet...");
    const valmisteet = root.Laakevalmiste || [];
    let medicineCount = 0;

    for (const v of valmisteet) {
      const substanceId = v["ATC-koodi"]?.["@_value"]?.toLowerCase() || 'tuntematon';
      const medicineId = v["@_id"];

      if (!medicineId) continue;

      try {
        await prisma.medicine.upsert({
          where: { id: medicineId },
          update: {
            name: v.Kauppanimi || "Nimetön",
            atcCode: v["ATC-koodi"]?.["@_id"] || null,
            isPediatric: v.Lastenlaake === '1',
            prescriptionTerm: v.Maaraamisehto?.["@_value"] || null,
            status: v.Myyntilupa?.Tila?.["@_value"] || null,
            isBiosimilar: v.Biosimilaari === '1',
            substanceId: substanceId
          },
          create: {
            id: medicineId,
            name: v.Kauppanimi || "Nimetön",
            substanceId: substanceId,
            isPediatric: v.Lastenlaake === '1',
            isBiosimilar: v.Biosimilaari === '1',
            prescriptionTerm: v.Maaraamisehto?.["@_value"] || null,
          }
        });
        medicineCount++;
      } catch (dbError) {
        console.warn(`⚠️ Virhe valmisteen ${medicineId} kohdalla:`, dbError.message);
      }
    }
    console.log(`Käsitelty ${medicineCount} valmistetta.`);

    // 3. СИНХРОНИЗАЦИЯ УПАКОВОК (Package)
    console.log("Päivitetään pakkaukset...");
    const pakkaukset = root.Pakkaus || [];
    let packageCount = 0;

    for (const p of pakkaukset) {
      const vnr = p["VNR-numero"]?.toString();
      if (!vnr) continue;

      try {
        await prisma.package.upsert({
          where: { vnr: vnr },
          update: {
            isAvailable: p.Kaupanolo?.Kaupan === '1',
            sizeText: p.Pakkauskokoteksti || null
          },
          create: {
            vnr: vnr,
            medicineId: p["@_Laakevalmiste-ref"],
            sizeText: p.Pakkauskokoteksti || null,
            isAvailable: p.Kaupanolo?.Kaupan === '1'
          }
        });
        packageCount++;
      } catch (dbError) {
        console.warn(`⚠️ Virhe pakkauksen VNR ${vnr} kohdalla:`, dbError.message);
      }
    }
    console.log(`Käsitelty ${packageCount} pakkausta.`);

    console.log("✅ Tietokanta on nyt synkronoitu Fimean kanssa!");
  } catch (error) {
    console.error("!!! Kriittinen virhe !!!", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
