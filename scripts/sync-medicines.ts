const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

async function syncFimeaMedicines() {
  console.log('--- Aloitetaan lääketietokannan päivitys ---');

  // Актуальный URL реестра Fimea (может потребоваться проверка на avoindata.fi)
  const FIMEA_URL = 'https://data.pilvi.fimea.fi/perusrekisteri/fimea_valmisteet.xml'; 

  try {
    console.log('Ladataan tietoja Fimeasta...');
    const response = await axios.get(FIMEA_URL, { timeout: 30000 }); // Таймаут 30 сек
    
    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonData = parser.parse(response.data);
    
    // Пытаемся найти массив лекарств в разных узлах
    const medicines = jsonData?.valmisteet?.valmiste || jsonData?.root?.valmiste || [];

    if (medicines.length === 0) {
      throw new Error('XML-tiedosto on tyhjä tai rakenne on muuttunut.');
    }

    console.log(`Löydetty ${medicines.length} valmistetta. Päivitetään tietokanta...`);

    for (const med of medicines.slice(0, 100)) { // Для теста берем первые 100
      const vnr = String(med.vnr || '');
      if (!vnr) continue;

      await prisma.medicine.upsert({
        where: { vnr: vnr },
        update: {
          name: med.kauppanimi || 'Ei nimeä',
          substance: med.vaikuttava_aine || '',
          strength: med.vahvuus || '',
          form: med.muoto || '',
          atcCode: med.atc_koodi || '',
          indications: med.kayttotarkoitus || '',
          updatedAt: new Date(),
        },
        create: {
          vnr: vnr,
          name: med.kauppanimi || 'Ei nimeä',
          substance: med.vaikuttava_aine || '',
          strength: med.vahvuus || '',
          form: med.muoto || '',
          atcCode: med.atc_koodi || '',
          indications: med.kayttotarkoitus || '',
        },
      });
    }

    console.log('--- Päivitys valmis! ---');
  } catch (error) {
    console.error('!!! Virhe !!!');
    console.error('Syy:', error.message);
    
    // ТЕСТОВЫЙ РЕЖИМ: Если сервер Fimea недоступен, создадим 2 записи для проверки базы
    console.log('Ajetaan testitila: luodaan muutama esimerkki tietokantaan...');
    const testMeds = [
      { vnr: '012345', name: 'Burana', substance: 'Ibuprofeeni', strength: '400mg', form: 'Tabletti', indications: 'Kipu ja kuume' },
      { vnr: '678910', name: 'Marevan', substance: 'Varfariini', strength: '3mg', form: 'Tabletti', indications: 'Veritulpan esto' }
    ];

    for (const med of testMeds) {
      await prisma.medicine.upsert({
        where: { vnr: med.vnr },
        update: med,
        create: med
      });
    }
    console.log('Testitiedot lisätty. Voit nyt testata hakua käyttöliittymässä!');
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
