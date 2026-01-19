const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

async function syncFimeaMedicines() {
  console.log('--- Aloitetaan lääketietokannan päivitys ---');
  const FIMEA_URL = 'https://data.pilvi.fimea.fi/avoin-data/Perusrekisteri.xml'; 

  try {
    console.log('Ladataan tietoja Fimeasta...');
    const response = await axios.get(FIMEA_URL, { 
      timeout: 120000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    console.log('Tiedosto ladattu. Jäsennellään...');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const jsonData = parser.parse(response.data);
    
    // ПРОВЕРКА СТРУКТУРЫ: Ищем массив лекарств в разных возможных узлах
    // В новом Perusrekisteri структура обычно: jsonData.perusrekisteri.valmisteet.valmiste
    let medicines = jsonData?.perusrekisteri?.valmisteet?.valmiste || 
                    jsonData?.valmisteet?.valmiste ||
                    jsonData?.root?.valmiste ||
                    jsonData?.valmiste;

    // Если всё еще не нашли, пробуем найти через поиск по ключам (защита от изменений структуры)
    if (!medicines || !Array.isArray(medicines)) {
       const rootKey = Object.keys(jsonData)[0];
       medicines = jsonData[rootKey]?.valmisteet?.valmiste || jsonData[rootKey]?.valmiste;
    }

    if (!medicines || !Array.isArray(medicines)) {
      throw new Error(`XML rakenne ei täsmää. Juuriavaimet: ${Object.keys(jsonData)}`);
    }

    console.log(`Löydetty ${medicines.length} valmistetta. Tallennetaan...`);

    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      const vnr = String(med.vnr || '');
      if (!vnr) continue;

      await prisma.medicine.upsert({
        where: { vnr: vnr },
        update: {
          name: String(med.kauppanimi || 'Ei nimeä'),
          substance: String(med.vaikuttava_aine || ''),
          strength: String(med.vahvuus || ''),
          form: String(med.muoto || ''),
          atcCode: String(med.atc_koodi || ''),
          indications: String(med.kayttotarkoitus || ''),
          updatedAt: new Date(),
        },
        create: {
          vnr: vnr,
          name: String(med.kauppanimi || 'Ei nimeä'),
          substance: String(med.vaikuttava_aine || ''),
          strength: String(med.vahvuus || ''),
          form: String(med.muoto || ''),
          atcCode: String(med.atc_koodi || ''),
          indications: String(med.kayttotarkoitus || ''),
        },
      });

      if (i % 500 === 0) console.log(`Edistyminen: ${i} / ${medicines.length}...`);
    }

    console.log('--- Päivitys valmis onnistuneesti! ---');
  } catch (error) {
    console.error('!!! Virhe !!!');
    console.error('Syy:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
