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
    
    const medicines = jsonData?.Perusrekisteri?.Laakevalmiste;

    if (!medicines || !Array.isArray(medicines)) {
      throw new Error('Laakevalmiste-listaa ei löytynyt.');
    }

    console.log(`Löydetty ${medicines.length} valmistetta. Tallennetaan...`);

    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      
      // ПОПЫТКА НАЙТИ ИДЕНТИФИКАТОР (VNR или внутренний ID)
      const pack = Array.isArray(med.Pakkaus) ? med.Pakkaus[0] : med.Pakkaus;
      // Если VNR нет, создаем временный ID на основе индекса, чтобы данные попали в базу
      const vnr = String(med.VnrKoodi || pack?.VnrKoodi || `ID-${i}`);
      
      const name = String(med.Kauppanimi || 'Ei nimeä');
      const substance = String(med.VaikuttavaAine || med.VaikuttavatAineet || '');

      await prisma.medicine.upsert({
        where: { vnr: vnr },
        update: {
          name: name,
          substance: substance,
          strength: String(med.Vahvuus || ''),
          form: String(med.Laakemuoto || ''),
          atcCode: String(med.AtcKoodi || ''),
          indications: String(med.Kayttotarkoitus || ''),
          updatedAt: new Date(),
        },
        create: {
          vnr: vnr,
          name: name,
          substance: substance,
          strength: String(med.Vahvuus || ''),
          form: String(med.Laakemuoto || ''),
          atcCode: String(med.AtcKoodi || ''),
          indications: String(med.Kayttotarkoitus || ''),
        },
      });

      if (i % 1000 === 0) {
        console.log(`Edistyminen: ${i} / ${medicines.length}...`);
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
