require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');
const User = require('../models/User');

// Force reliable DNS resolvers for Atlas SRV lookups on restricted networks.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const fakeUsers = [
  {
    full_name: 'Admin One',
    email: 'admin1@nu-laguna.edu.ph',
    password: 'Admin123!',
    role: 'admin',
    status: 'active'
  },
  {
    full_name: 'Admin Two',
    email: 'admin2@nu-laguna.edu.ph',
    password: 'Registrar456!',
    role: 'admin',
    status: 'active'
  },
  {
    full_name: 'Student One',
    email: 'student1@nu-laguna.edu.ph',
    password: 'Student123!',
    role: 'student',
    status: 'active'
  },
  {
    full_name: 'Student Two',
    email: 'student2@nu-laguna.edu.ph',
    password: 'NUStudent456!',
    role: 'student',
    status: 'active'
  }
];

async function seedFakeLoginUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME
    });

    const bulkOperations = fakeUsers.map((user) => ({
      updateOne: {
        filter: { email: user.email },
        update: { $set: user },
        upsert: true
      }
    }));

    const result = await User.bulkWrite(bulkOperations);

    console.log('Seeding complete.');
    console.log('Matched:', result.matchedCount);
    console.log('Modified:', result.modifiedCount);
    console.log('Upserted:', result.upsertedCount);

    console.log('\nFake credentials for login testing:');
    fakeUsers.forEach((user) => {
      console.log(`- ${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    });
  } catch (error) {
    console.error('Failed to seed fake users:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seedFakeLoginUsers();
