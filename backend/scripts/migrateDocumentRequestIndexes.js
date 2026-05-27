require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');
const DocumentRequest = require('../models/DocumentRequest');

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function migrateDocumentRequestIndexes() {
  if (!process.env.MONGO_URI || !process.env.DB_NAME) {
    throw new Error('MONGO_URI and DB_NAME are required.');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME
  });

  const indexes = await DocumentRequest.syncIndexes();

  console.log('DocumentRequest index migration complete.');
  console.log('Dropped indexes:', JSON.stringify(indexes));
}

migrateDocumentRequestIndexes()
  .catch((err) => {
    console.error('DocumentRequest index migration failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });