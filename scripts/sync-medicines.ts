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

    // 1. СИНХРОНИЗАЦИЯ ВЕЩЕСТВ (Substance)
    console.log("Päivitetään vaikuttavat aineet (Lääke75+)...");
    const aineet = root.Laakeaine || [];
    let substanceCount = 0;

    for (const aine of aineet) {
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
            communityNotes: ""
          }
        });
        substanceCount++;
      } catch (e) {}
    }
    console.log(`Käsitelty ${substanceCount} ainetta.`);

    // 2. СИНХРОНИЗАЦИЯ ПРЕПАРАТОВ (Medicine)
    console.log("Päivitetään lääkevalmisteet...");
    const valmisteet = root.Laakevalmiste || [];
    let medicineCount = 0;

    for (const v of valmisteet) {
      const medicineId = v["@_id"];
      if (!medicineId) continue;

      const substanceId = v["ATC-koodi"]?.["@_value"]?.toLowerCase() || 'tuntematon';

      try {
        await prisma.medicine.upsert({
          where: { id: medicineId },
          update: {
            name: String(v.Kauppanimi || "Nimetön"),
            atcCode: v["ATC-koodi"]?.["@_id"] || null,
            isPediatric: v.Lastenlaake === '1' || v.Lastenlaake === 1,
            prescriptionTerm: v.Maaraamisehto?.["@_value"] || null,
            status: v.Myyntilupa?.Tila?.["@_value"] || null,
            isBiosimilar: v.Biosimilaari === '1' || v.Biosimilaari === 1,
            substanceId: substanceId
          },
          create: {
            id: medicineId,
            name: String(v.Kauppanimi || "Nimetön"),
            substanceId: substanceId,
            isPediatric: v.Lastenlaake === '1' || v.Lastenlaake === 1,
            isBiosimilar: v.Biosimilaari === '1' || v.Biosimilaari === 1,
            prescriptionTerm: v.Maaraamisehto?.["@_value"] || null,
          }
        });
        medicineCount++;
      } catch (e) {}
    }
    console.log(`Käsitelty ${medicineCount} valmistetta.`);

    // 3. СИНХРОНИЗАЦИЯ УПАКОВОК (Package)
    console.log("Päivitetään pakkaukset...");
    const pakkaukset = root.Pakkaus || [];
    let packageCount = 0;

    for (const p of pakkaukset) {
      const vnr = p["VNR-numero"]?.toString();
      const medicineId = p["@_Laakevalmiste-ref"];
      
      if (!vnr || !medicineId) continue;

      // ПРОВЕРКА: Существует ли Medicine в базе, чтобы избежать Foreign Key Violation
      const parentMedicine = await prisma.medicine.findUnique({
        where: { id: medicineId }
      });

      if (!parentMedicine) {
        // Если препарата нет в базе, мы не можем создать упаковку
        continue;
      }

      try {
        await prisma.package.upsert({
          where: { vnr: vnr },
          update: {
            isAvailable: p.Kaupanolo?.Kaupan === '1' || p.Kaupanolo?.Kaupan === 1,
            // Явное приведение к строке, чтобы Prisma не видела Int
            sizeText: p.Pakkauskokoteksti ? String(p.Pakkauskokoteksti) : null
          },
          create: {
            vnr: vnr,
            medicineId: medicineId,
            sizeText: p.Pakkauskokoteksti ? String(p.Pakkauskokoteksti) : null,
            isAvailable: p.Kaupanolo?.Kaupan === '1' || p.Kaupanolo?.Kaupan === 1
          }
        });
        packageCount++;
      } catch (dbError) {
        console.warn(`⚠️ Pakkaus VNR ${vnr} skipattu:`, dbError.message);
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
