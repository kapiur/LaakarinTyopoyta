import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const prisma = new PrismaClient();

async function syncFimeaMedicines() {
  console.log('--- Aloitetaan lääketietokannan päivitys ---');

  try {
    // 1. Скачиваем актуальный XML-файл (Perusrekisteri)
    // URL может меняться, Fimea предоставляет их на avoindata.fi
    const FIMEA_URL = 'https://data.pilvi.fimea.fi/perusrekisteri/fimea_spc.xml'; 
    console.log('Ladataan tietoja Fimeasta...');
    const response = await axios.get(FIMEA_URL);
    
    // 2. Парсим XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: ""
    });
    const jsonData = parser.parse(response.data);

    // Предполагаемая структура: jsonData.reksisteri.valmiste
    const medicines = jsonData?.root?.valmiste || []; 
    console.log(`Löydetty ${medicines.length} valmistetta. Päivitetään tietokanta...`);

    for (const med of medicines) {
      // Извлекаем нужные нам поля (логика маппинга зависит от структуры XML)
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
          // Логика извлечения GFR может быть сложнее (поиск по тексту инструкции)
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

    console.log('--- Päivitys valmis onnistuneesti! ---');
  } catch (error) {
    console.error('Virhe päivityksessä:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncFimeaMedicines();
