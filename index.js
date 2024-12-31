// Import required modules
const express = require('express');
const ping = require('ping');
const cors = require('cors');
const { Client } = require('pg');
require('dotenv').config(); // Load environment variables from .env file

// Initialize express app
const app = express();

// Middleware
app.use(express.json());  // Parse JSON requests
app.use(cors());          // Enable cross-origin requests

// PostgreSQL client setup
const client = new Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

// Connect to PostgreSQL database
client.connect()
    .then(() => console.log("Connected to PostgreSQL"))
    .catch(err => console.error('Connection error', err.stack));

// API Endpoint to get all devices
app.get('/api/devices', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM devices');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving devices');
    }
});

// API Endpoint to update a device status
app.post('/api/devices/update', async (req, res) => {
    const { ip_address, status } = req.body;
    try {
        await client.query('UPDATE devices SET status = $1 WHERE vpn_ip = $2', [status, ip_address]);
        res.status(200).send('Device status updated');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating device status');
    }
});

// Set the server to listen on a port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Function to ping a device and update its status
async function checkDeviceStatus() {
    try {
        const result = await client.query('SELECT * FROM devices');
        const devices = result.rows;

        for (let device of devices) {
            // Ping the device's VPN IP
            ping.sys.probe(device.vpn_ip, async (isAlive) => {
                const status = isAlive ? 'online' : 'offline';

                // Update the status in the database
                await client.query(
                    'UPDATE devices SET status = $1 WHERE no = $2',
                    [status, device.no]
                );

                console.log(`Device ${device.name} is ${status}`);
            });
        }
    } catch (error) {
        console.error('Error checking device status:', error);
    }
}

// Call the function every 30 seconds
setInterval(checkDeviceStatus, 30000); // 30 seconds = 30000 ms