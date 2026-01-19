const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

async function syncFimeaMedicines() {
  console.log('--- Aloitetaan lääketietokannan päivitys ---');

  try {
    // Прямая ссылка на XML реестр (SPC данные)
    const FIMEA_URL = 'https://data.pilvi.fimea.fi/perusrekisteri/fimea_spc.xml'; 
    console.log('Ladataan tietoja Fimeasta... (tämä voi kestää hetken)');
    
    const response = await axios.get(FIMEA_URL);
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: ""
    });
    
    const jsonData = parser.parse(response.data);
    
    // В структуре Fimea данные обычно лежат в root -> valmisteet -> valmiste
    // Пробуем разные пути парсинга
    const medicines = jsonData?.valmisteet?.valmiste || jsonData?.root?.valmiste || []; 
    
    if (medicines.length === 0) {
      console.log('VAROITUS: Lääkkeitä ei löytynyt XML-tiedostosta. Tarkista XML:n rakenne.');
      return;
    }

    console.log(`Löydetty ${medicines.length} valmistetta. Päivitetään tietokanta...`);

    for (const med of medicines) {
      const vnr = String(med.vnr || '');
      if (!vnr) continue;

      // Маппинг полей согласно вашим названиям в XML Fimea
      await prisma.medicine.upsert({
        where: { vnr: vnr },
        update: {
          name: med.kauppanimi || 'Ei nimeä',
          substance: med.vaikuttava_aine || '',
          strength: med.vahvuus || '',
          form: med.muoto || '',
          atcCode: med.atc_koodi || '',
          indications: med.kayttotarkoitus || '',
          gfrInstructions: med.munuaisten_vajaatoiminta || null,
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
          gfrInstructions: med.munuaisten_vajaatoiminta || null,
        },
      });
    }

    console.log('--- Päivitys valmis! ---');
  } catch (error) {
    console.error('Virhe päivityksessä:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
