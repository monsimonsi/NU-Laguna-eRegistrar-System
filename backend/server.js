require('dotenv').config();

const express = require('express');
const dns = require('dns'); // Lets Node use custom DNS resolvers.
const mongoose = require('mongoose');
const app = express();

// Force reliable DNS resolvers for Atlas SRV lookups on restricted networks.
dns.setServers(['8.8.8.8', '1.1.1.1']); // Uses public DNS to resolve Atlas SRV records.

// Connect to MongoDB and start the server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log('Server is running on port', process.env.PORT);
        });
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB', error);
    });
