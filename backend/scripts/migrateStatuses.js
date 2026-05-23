require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');
const DocumentRequest = require('../models/DocumentRequest');

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function migrateStatuses() {
  if (!process.env.MONGO_URI || !process.env.DB_NAME) {
    throw new Error('MONGO_URI and DB_NAME are required.');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME
  });

  const completed = await DocumentRequest.updateMany(
    { status: 'Completed' },
    { $set: { status: 'Released' } }
  );

  const ready = await DocumentRequest.updateMany(
    { status: 'Ready' },
    { $set: { status: 'Ready for Pickup' } }
  );

  const paymentFlags = await DocumentRequest.updateMany(
    { paymentConfirmed: { $exists: false } },
    { $set: { paymentConfirmed: true } }
  );

  console.log('Migration complete.');
  console.log('Completed -> Released:', completed.modifiedCount || 0);
  console.log('Ready -> Ready for Pickup:', ready.modifiedCount || 0);
  console.log('Added paymentConfirmed=true:', paymentFlags.modifiedCount || 0);
}

migrateStatuses()
  .catch((err) => {
    console.error('Status migration failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
