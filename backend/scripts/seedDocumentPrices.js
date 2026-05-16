require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');
const DocumentPrice = require('../models/DocumentPrice');

// Force reliable DNS resolvers for Atlas SRV lookups on restricted networks.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const DELIVERY_FEE = 150;

const prices = [
  { documentType: 'Transcript of Records (TOR)', basePrice: 1060 },
  { documentType: 'Certificate of Registration (COR)', basePrice: 54 },
  { documentType: 'Certificates', basePrice: 157 },
  { documentType: 'Certificate of Good Moral Character', basePrice: 127 },
  { documentType: 'Completion of Grades', basePrice: 145 },
  { documentType: 'Copy of Grades', basePrice: 54 },
  { documentType: 'Course Curriculum', basePrice: 54 },
  {
    documentType: 'Course Description 1st Page',
    basePrice: 157,
    perSucceedingPageFee: 123
  },
  { documentType: 'Load Revision Form & Processing', basePrice: 102 },
  { documentType: 'Shifting Form', basePrice: 420 },
  { documentType: 'SHS Report Card', basePrice: 54 },
  { documentType: 'SHS SF10 / Form 137A', basePrice: 183 }
];

async function seedDocumentPrices() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME
    });

    const bulkOperations = prices.map((item) => ({
      updateOne: {
        filter: { documentType: item.documentType },
        update: {
          $set: {
            documentType: item.documentType,
            basePrice: item.basePrice,
            perSucceedingPageFee: item.perSucceedingPageFee || 0,
            deliveryFee: DELIVERY_FEE,
            active: true
          }
        },
        upsert: true
      }
    }));

    const result = await DocumentPrice.bulkWrite(bulkOperations);

    console.log('Pricing seed complete.');
    console.log('Matched:', result.matchedCount);
    console.log('Modified:', result.modifiedCount);
    console.log('Upserted:', result.upsertedCount);
  } catch (error) {
    console.error('Failed to seed document prices:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seedDocumentPrices();
