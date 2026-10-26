const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');
const https = require('https');
const fs = require('fs');

function localAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) return address.address;
    }
  }
  return 'localhost';
}

function startGyroServer({ port = 3000, onReading = () => {}, onConnection = () => {} } = {}) {
  const app = express();
  app.get('/', (_request, response) => response.redirect('/controller/'));
  app.use('/phone', express.static(path.join(__dirname, 'public', 'phone')));
  app.use('/controller', express.static(path.join(__dirname, 'public', 'controller')));

  const server = https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'localhost+2-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost+2.pem')),
  }, app);
  const wss = new WebSocketServer({ server });
  // The HTTP server owns startup errors. Keeping this listener avoids an
  // unhandled duplicate error event from ws if the port is unavailable.
  wss.on('error', () => {});

  wss.on('connection', (socket) => {
    let role = 'unknown';

    socket.on('message', (message) => {
      try {
        const reading = JSON.parse(message.toString());
        if (reading.type === 'hello' && ['phone', 'controller'].includes(reading.role)) {
          role = reading.role;
          if (role === 'phone') onConnection(true);
          return;
        }

        if (role !== 'phone' || reading.type !== 'motion') return;
        const { gyro, pose, timestamp } = reading;
        if (!gyro || !pose || ![gyro.x, gyro.y, gyro.z, pose.alpha, pose.beta, pose.gamma].every(Number.isFinite)) return;

        const packet = {
          type: 'motion',
          gyro,
          pose,
          timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
          receivedAt: Date.now(),
        };

        onReading(packet);
        for (const client of wss.clients) {
          if (client !== socket && client.readyState === WebSocket.OPEN) client.send(JSON.stringify(packet));
        }
      } catch {
        // Ignore malformed messages from a client.
      }
    });

    socket.on('close', () => {
      if (role === 'phone') onConnection(false);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      server.removeListener('error', reject);
      const boundPort = server.address().port;
      resolve({
        server,
        port: boundPort,
        phoneUrl: `https://${localAddress()}:${boundPort}/phone/`,
      });
    });
  });
}

module.exports = { startGyroServer };
