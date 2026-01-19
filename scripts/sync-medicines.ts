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
      isArray: (name) => ["Laakevalmiste", "Laakeaine"].includes(name) 
    });
    
    const jsonData = parser.parse(response.data);
    const root = jsonData.Perusrekisteri;
    
    // Согласно вашему логу DEBUG, данные лежат здесь:
    const medicines = root?.Laakevalmiste || [];

    if (medicines.length === 0) {
      console.log("DEBUG: XML sisältö:", Object.keys(root || {}));
      throw new Error('Lääkelistaa ei löytynyt. Tarkista XML-rakenne.');
    }

    console.log(`Löydetty ${medicines.length} valmistetta. Tallennetaan...`);

    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      
      // VNR код в этом файле обычно находится в структуре упаковок или в корне препарата
      const vnr = String(med.VnrKoodi || med.Pakkaus?.VnrKoodi || '');
      if (!vnr || vnr === 'undefined') continue;

      await prisma.medicine.upsert({
        where: { vnr: vnr },
        update: {
          name: String(med.Kauppanimi || 'Ei nimeä'),
          substance: String(med.VaikuttavaAine || ''),
          strength: String(med.Vahvuus || ''),
          form: String(med.Laakemuoto || ''),
          atcCode: String(med.AtcKoodi || ''),
          indications: String(med.Kayttotarkoitus || ''),
          updatedAt: new Date(),
        },
        create: {
          vnr: vnr,
          name: String(med.Kauppanimi || 'Ei nimeä'),
          substance: String(med.VaikuttavaAine || ''),
          strength: String(med.Vahvuus || ''),
          form: String(med.Laakemuoto || ''),
          atcCode: String(med.AtcKoodi || ''),
          indications: String(med.Kayttotarkoitus || ''),
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
