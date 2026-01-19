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
      attributeNamePrefix: "",
      // Fimea использует вложенность, заставляем парсер всегда делать массивы для списков
      isArray: (name) => ["Valmiste", "valmiste"].includes(name) 
    });
    
    const jsonData = parser.parse(response.data);
    
    // На основе вашего лога (Juuriavaimet: Perusrekisteri), настраиваем точный путь
    // Пробуем разные варианты регистра (Valmisteet vs valmisteet)
    const root = jsonData.Perusrekisteri || jsonData.perusrekisteri;
    const medicines = root?.Valmisteet?.Valmiste || 
                      root?.valmisteet?.valmiste || 
                      root?.Valmiste || 
                      [];

    if (medicines.length === 0) {
      console.log("DEBUG: XML sisältö:", Object.keys(root || {}));
      throw new Error('Lääkelistaa ei löytynyt Perusrekisteri-solmun alta.');
    }

    console.log(`Löydetty ${medicines.length} valmistetta. Tallennetaan tietokantaan...`);

    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      const vnr = String(med.vnr || '');
      if (!vnr) continue;

      await prisma.medicine.upsert({
        where: { vnr: vnr },
        update: {
          name: String(med.kauppanimi || 'Ei nimeä'),
          substance: String(med.vaikuttava_aine || med.vaikuttavat_aineet || ''),
          strength: String(med.vahvuus || ''),
          form: String(med.muoto || med.laakemuoto || ''),
          atcCode: String(med.atc_koodi || ''),
          indications: String(med.kayttotarkoitus || ''),
          updatedAt: new Date(),
        },
        create: {
          vnr: vnr,
          name: String(med.kauppanimi || 'Ei nimeä'),
          substance: String(med.vaikuttava_aine || med.vaikuttavat_aineet || ''),
          strength: String(med.vahvuus || ''),
          form: String(med.muoto || med.laakemuoto || ''),
          atcCode: String(med.atc_koodi || ''),
          indications: String(med.kayttotarkoitus || ''),
        },
      });

      if (i % 500 === 0) {
        console.log(`Edistyminen: ${i} / ${medicines.length} tallennettu...`);
      }
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
