const { PrismaClient } = require('@prisma/client');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');

const prisma = new PrismaClient();
const FIMEA_FILE_PATH = './medicines.xml'; 

async function syncFullFimeaDatabase() {
  console.log("--- СТАРТ ПОЛНОЙ СИНХРОНИЗАЦИИ (189MB / 3.6M строк) ---");
  
  if (!fs.existsSync(FIMEA_FILE_PATH)) {
    console.error("❌ Файл medicines.xml не найден в корне!");
    return;
  }

  try {
    console.log("1. Чтение файла в память...");
    const xmlData = fs.readFileSync(FIMEA_FILE_PATH, 'utf-8');
    
    console.log("2. Парсинг структуры (это займет время)...");
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => ["Laakevalmiste", "Laakeaine", "Pakkaus"].includes(name)
    });
    
    const jsonObj = parser.parse(xmlData);
    const root = jsonObj.Perusrekisteri;

    if (!root) throw new Error("Не найден корень Perusrekisteri");

    // --- ШАГ 1: ВЕЩЕСТВА (RES) ---
    console.log("3. Синхронизация Substance (из конца файла)...");
    const aineet = root.Laakeaine || [];
    let sCount = 0;
    for (const aine of aineet) {
      const vAine = aine.VaikuttavaAine;
      const name = vAine?.Aine?.["@_value"]?.trim().toLowerCase();
      if (!name) continue;

      await prisma.substance.upsert({
        where: { id: name },
        update: {
          laake75Class: vAine.Laake75?.Luokka?.["@_id"] || null,
          laake75Comment: vAine.Laake75?.KommenttiFI || null,
        },
        create: { 
            id: name, 
            communityNotes: "", 
            laake75Class: vAine.Laake75?.Luokka?.["@_id"] || null,
            laake75Comment: vAine.Laake75?.KommenttiFI || null,
        }
      });
      sCount++;
    }
    console.log(`✅ Веществ в базе: ${sCount}`);

    // --- ШАГ 2: ПРЕПАРАТЫ (REL) ---
    console.log("4. Синхронизация Medicine (REL)...");
    const valmisteet = root.Laakevalmiste || [];
    let mCount = 0;
    for (const v of valmisteet) {
      const subName = v["ATC-koodi"]?.["@_value"]?.trim().toLowerCase() || 'tuntematon';
      
      // Авто-создание Substance, если он не попал в первый список
      await prisma.substance.upsert({
        where: { id: subName },
        update: {},
        create: { id: subName, communityNotes: "" }
      });

      await prisma.medicine.upsert({
        where: { id: v["@_id"] },
        update: {
          name: String(v.Kauppanimi),
          substanceId: subName,
          atcCode: v["ATC-koodi"]?.["@_id"],
          isPediatric: String(v.Lastenlaake) === '1',
          prescriptionTerm: v.Maaraamisehto?.["@_value"] || null,
        },
        create: {
          id: v["@_id"],
          name: String(v.Kauppanimi),
          substanceId: subName,
          isPediatric: String(v.Lastenlaake) === '1',
        }
      });
      mCount++;
    }
    console.log(`✅ Препаратов в базе: ${mCount}`);

    // --- ШАГ 3: УПАКОВКИ (VNR) ---
    console.log("5. Синхронизация Package (VNR)...");
    const pakkaukset = root.Pakkaus || [];
    let pCount = 0;
    for (const p of pakkaukset) {
      const medicineId = p["@_Laakevalmiste-ref"];
      const vnr = p["VNR-numero"]?.toString();
      
      if (!vnr || !medicineId) continue;

      try {
        await prisma.package.upsert({
          where: { vnr: vnr },
          update: {
            isAvailable: String(p.Kaupanolo?.Kaupan) === '1',
            sizeText: p.Pakkauskokoteksti ? String(p.Pakkauskokoteksti) : null
          },
          create: {
            vnr: vnr,
            medicineId: medicineId,
            sizeText: p.Pakkauskokoteksti ? String(p.Pakkauskokoteksti) : null,
            isAvailable: String(p.Kaupanolo?.Kaupan) === '1'
          }
        });
        pCount++;
      } catch (err) {
        // Пропускаем, если REL еще нет в БД (редкий случай для полной базы)
      }
    }
    console.log(`✅ Упаковок в базе: ${pCount}`);

    console.log("🏁 ФИНИШ: Синхронизация завершена успешно.");
  } catch (error) {
    console.error("!!! КРИТИЧЕСКАЯ ОШИБКА !!!", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncFullFimeaDatabase();
