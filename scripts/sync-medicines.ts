import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

const prisma = new PrismaClient();

async function sync() {
  console.log("🚀 Aloitetaan lääketietojen synkronointi...");
  
  // 1. Читаем файл (путь должен вести к вашему XML)
  const xmlData = fs.readFileSync('./data/fimea_data.xml', 'utf-8');
  const parser = new XMLParser({ ignoreAttributes: false });
  const jsonObj = parser.parse(xmlData);
  
  const products = jsonObj.FimeaData.Product; // Путь может меняться в зависимости от структуры XML

  for (const p of products) {
    const substanceName = p.VaikuttavaAine?.toLowerCase() || 'tuntematon';
    
    // А. Обновляем или создаем Вещество (Substance)
    // Мы НЕ трогаем communityNotes, если они уже есть
    await prisma.substance.upsert({
      where: { id: substanceName },
      update: {
        // Здесь можно обновить данные Lääke75+, если они есть в XML
        isBiological: p.Biologinen === '1',
      },
      create: {
        id: substanceName,
        isBiological: p.Biologinen === '1',
        communityNotes: "" // Пустое поле для будущих заметок врачей
      }
    });

    // Б. Обновляем или создаем Препарат (Medicine)
    await prisma.medicine.upsert({
      where: { id: p.ProductId.toString() },
      update: {
        name: p.Kauppanimi,
        isPediatric: p.Lastenlaake === '1',
        prescriptionTerm: p.Maaraamisehto,
        status: p.Tila
      },
      create: {
        id: p.ProductId.toString(),
        name: p.Kauppanimi,
        substanceId: substanceName,
        isPediatric: p.Lastenlaake === '1',
        prescriptionTerm: p.Maaraamisehto,
        status: p.Tila
      }
    });

    // В. Обновляем или создаем Упаковку (Package)
    await prisma.package.upsert({
      where: { vnr: p.VNR.toString() },
      update: {
        sizeText: p.Pakkauskoko,
        strength: p.Vahvuus,
        form: p.Laakemuoto,
        isAvailable: p.Kaupan === '1'
      },
      create: {
        vnr: p.VNR.toString(),
        medicineId: p.ProductId.toString(),
        sizeText: p.Pakkauskoko,
        strength: p.Vahvuus,
        form: p.Laakemuoto,
        isAvailable: p.Kaupan === '1'
      }
    });
  }
  
  console.log("✅ Synkronointi valmis!");
}

sync().catch(console.error).finally(() => prisma.$disconnect());
