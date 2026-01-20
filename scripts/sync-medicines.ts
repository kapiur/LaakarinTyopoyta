const { PrismaClient } = require('@prisma/client');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();
// Прямая ссылка на полную базу Fimea
const FIMEA_URL = 'https://data.pilvi.fimea.fi/avoin-data/Perusrekisteri.xml';

async function syncFimeaMedicines() {
  console.log("--- СТАРТ ПРЯМОЙ ЗАГРУЗКИ С FIMEA (189MB) ---");
  
  try {
    console.log(`1. Установка соединения с ${FIMEA_URL}...`);
    const response = await fetch(FIMEA_URL);
    
    if (!response.ok) {
        throw new Error(`Не удалось загрузить файл: ${response.statusText}`);
    }

    console.log("2. Получение данных (может занять 1-2 минуты)...");
    const xmlData = await response.text();
    console.log(`Данные получены. Размер: ${(xmlData.length / 1024 / 1024).toFixed(2)} MB`);

    console.log("3. Парсинг XML структуры...");
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      // КРИТИЧЕСКИ ВАЖНО для полной базы: всегда парсить эти теги как массивы
      isArray: (name) => ["Laakevalmiste", "Laakeaine", "Pakkaus"].includes(name)
    });
    
    const jsonObj = parser.parse(xmlData);
    const root = jsonObj.Perusrekisteri;

    if (!root) throw new Error("Не удалось найти корень Perusrekisteri в полученном XML");

    // --- ШАГ 1: ВЕЩЕСТВА (RES) ---
    // Они находятся в конце файла, но в JSON доступны сразу после парсинга
    console.log("4. Синхронизация Substance (Действующие вещества)...");
    const aineet = root.Laakeaine || [];
    let sCount = 0;
    for (const aine of aineet) {
      const vAine = aine.VaikuttavaAine;
      const name = vAine?.Aine?.["@_value"]?.trim().toLowerCase();
      if (!name) continue;

      // [2026-01-19] План включает скрипт обновления БД. 
      // Upsert гарантирует, что communityNotes не затрутся.
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
      if (sCount % 1000 === 0) console.log(`...обработано ${sCount} веществ`);
    }

    // --- ШАГ 2: ПРЕПАРАТЫ (REL) ---
    console.log("5. Синхронизация Medicine (Торговые названия)...");
    const valmisteet = root.Laakevalmiste || [];
    let mCount = 0;
    for (const v of valmisteet) {
      const medicineId = v["@_id"];
      if (!medicineId) continue;

      const subName = v["ATC-koodi"]?.["@_value"]?.trim().toLowerCase() || 'tuntematon';
      
      // Гарантируем наличие вещества для соблюдения реляционной связи
      await prisma.substance.upsert({
        where: { id: subName },
        update: {},
        create: { id: subName, communityNotes: "" }
      });

      await prisma.medicine.upsert({
        where: { id: medicineId },
        update: {
          name: String(v.Kauppanimi),
          substanceId: subName,
          atcCode: v["ATC-koodi"]?.["@_id"] || null,
          isPediatric: String(v.Lastenlaake) === '1',
          prescriptionTerm: v.Maaraamisehto?.["@_value"] || null,
        },
        create: {
          id: medicineId,
          name: String(v.Kauppanimi),
          substanceId: subName,
          isPediatric: String(v.Lastenlaake) === '1',
        }
      });
      mCount++;
      if (mCount % 1000 === 0) console.log(`...обработано ${mCount} препаратов`);
    }

    // --- ШАГ 3: УПАКОВКИ (VNR) ---
    console.log("6. Синхронизация Package (Конкретные упаковки)...");
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
        if (pCount % 5000 === 0) console.log(`...обработано ${pCount} упаковок`);
      } catch (err) {
        // Пропускаем записи, если Medicine не был найден
      }
    }

    console.log(`🏁 ФИНИШ! База обновлена: ${sCount} веществ, ${mCount} препаратов, ${pCount} упаковок.`);

  } catch (error) {
    console.error("!!! КРИТИЧЕСКАЯ ОШИБКА !!!", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
