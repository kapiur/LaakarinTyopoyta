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
    const parser = new XMLParser({ 
      ignoreAttributes: false, 
      attributeNamePrefix: ""
    });
    
    const jsonData = parser.parse(response.data);
    
    // Прямой доступ к массиву
    const medicines = jsonData?.Perusrekisteri?.Laakevalmiste;

    if (!medicines || !Array.isArray(medicines)) {
      throw new Error('Laakevalmiste-listaa ei löytynyt. XML rakenne on ehkä muuttunut.');
    }

    console.log(`Löydetty ${medicines.length} valmistetta. Tallennetaan...`);

    // Очистим старые тестовые данные, чтобы видеть только реальные
    // await prisma.medicine.deleteMany({}); 

    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      
      // В Perusrekisteri.xml VNR код часто лежит внутри первого элемента Pakkaus
      const pack = Array.isArray(med.Pakkaus) ? med.Pakkaus[0] : med.Pakkaus;
      const vnr = String(med.VnrKoodi || pack?.VnrKoodi || '');
      
      if (!vnr || vnr === 'undefined' || vnr.length < 3) continue;

      try {
        await prisma.medicine.upsert({
          where: { vnr: vnr },
          update: {
            name: String(med.Kauppanimi || 'Ei nimeä'),
            substance: String(med.VaikuttavaAine || med.VaikuttavatAineet || ''),
            strength: String(med.Vahvuus || ''),
            form: String(med.Laakemuoto || ''),
            atcCode: String(med.AtcKoodi || ''),
            indications: String(med.Kayttotarkoitus || ''),
            updatedAt: new Date(),
          },
          create: {
            vnr: vnr,
            name: String(med.Kauppanimi || 'Ei nimeä'),
            substance: String(med.VaikuttavaAine || med.VaikuttavatAineet || ''),
            strength: String(med.Vahvuus || ''),
            form: String(med.Laakemuoto || ''),
            atcCode: String(med.AtcKoodi || ''),
            indications: String(med.Kayttotarkoitus || ''),
          },
        });
      } catch (e) {
        // Пропускаем ошибки записи отдельных строк
        continue;
      }

      if (i % 1000 === 0) {
        console.log(`Tallennetaan: ${i} / ${medicines.length}...`);
      }
    }

    console.log('--- Päivitys valmis! ---');
    const finalCount = await prisma.medicine.count();
    console.log(`Tietokannassa on nyt yhteensä ${finalCount} lääkettä.`);

  } catch (error) {
    console.error('!!! Virhe !!!');
    console.error('Syy:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
