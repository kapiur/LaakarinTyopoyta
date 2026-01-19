const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

async function syncFimeaMedicines() {
  console.log('--- Aloitetaan lääketietokannan päivitys ---');

  // Актуальная прямая ссылка на полный реестр
  const FIMEA_URL = 'https://data.pilvi.fimea.fi/avoin-data/Perusrekisteri.xml'; 

  try {
    console.log('Ladataan tietoja Fimeasta (tämä voi kestää 1-2 minuuttia)...');
    
    const response = await axios.get(FIMEA_URL, { 
      timeout: 120000, // Увеличиваем до 2 минут для скачивания большого файла
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/xml'
      }
    });

    console.log('Tiedosto ladattu. Jäsennellään XML-tietoja...');
    
    const parser = new XMLParser({ 
      ignoreAttributes: false,
      attributeNamePrefix: "" 
    });
    const jsonData = parser.parse(response.data);
    
    // В Perusrekisteri.xml корень обычно <perusrekisteri>, а в нем <valmisteet>
    const medicines = jsonData?.perusrekisteri?.valmisteet?.valmiste || 
                      jsonData?.valmisteet?.valmiste || 
                      jsonData?.root?.valmiste || [];

    if (medicines.length === 0) {
      throw new Error('XML-tiedosto on tyhjä tai rakenne on muuttunut. Tarkista URL.');
    }

    console.log(`Löydetty ${medicines.length} valmistetta. Päivitetään tietokanta...`);

    // Цикл обработки всей базы
    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      const vnr = String(med.vnr || '');
      
      if (!vnr) continue;

      // Используем upsert для предотвращения дубликатов
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

      // Выводим прогресс каждые 500 записей
      if (i % 500 === 0) {
        console.log(`Edistyminen: ${i} / ${medicines.length} lääkettä tallennettu...`);
      }
    }

    console.log('--- Päivitys valmis onnistuneesti! ---');
  } catch (error) {
    console.error('!!! Virhe !!!');
    console.error('Syy:', error.message);
    
    if (error.response?.status === 404) {
      console.log('Vinkki: URL on muuttunut. Tarkista uusi osoite fimea.fi sivuilta.');
    }

    // Резервный запуск тестовых данных при ошибке
    console.log('Ajetaan testitila...');
    const testMeds = [
      { vnr: '012345', name: 'Burana (Testi)', substance: 'Ibuprofeeni', strength: '400mg', form: 'Tabletti', indications: 'Kipu' },
      { vnr: '678910', name: 'Marevan (Testi)', substance: 'Varfariini', strength: '3mg', form: 'Tabletti', indications: 'Antikoagulaatio' }
    ];

    for (const med of testMeds) {
      await prisma.medicine.upsert({ where: { vnr: med.vnr }, update: med, create: med });
    }
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
