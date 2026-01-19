const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

// Хелпер для безопасного извлечения текста из XML-узла
// Помогает избежать [object Object], если узел содержит атрибуты
const getText = (node) => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'object') {
    return String(node['#text'] || node.nimi || Object.values(node)[0] || '');
  }
  return String(node);
};

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
      textNodeName: "#text" // Явно указываем имя для текстового контента
    });
    const jsonData = parser.parse(response.data);
    
    const medicines = jsonData?.Perusrekisteri?.Laakevalmiste;

    if (!medicines || !Array.isArray(medicines)) {
      throw new Error('Laakevalmiste-listaa ei löytynyt.');
    }

    console.log(`Löydetty ${medicines.length} valmistetta. Tallennetaan...`);

    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      
      // Поиск VNR кода
      const pack = Array.isArray(med.Pakkaus) ? med.Pakkaus[0] : med.Pakkaus;
      const vnr = String(getText(med.VnrKoodi) || getText(pack?.VnrKoodi) || `ID-${i}`);
      
      const medicineData = {
        name: getText(med.Kauppanimi) || 'Ei nimeä',
        substance: getText(med.VaikuttavaAine || med.VaikuttavatAineet),
        strength: getText(med.Vahvuus),
        form: getText(med.Laakemuoto), // Исправляет [object Object]
        atcCode: getText(med.AtcKoodi),
        indications: getText(med.Kayttotarkoitus),
      };

      await prisma.medicine.upsert({
        where: { vnr: vnr },
        update: {
          ...medicineData,
          updatedAt: new Date(),
        },
        create: {
          vnr: vnr,
          ...medicineData,
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
