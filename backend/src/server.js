const http = require('http');
const app = require('./app');
const config = require('./config');
const { initFirebase } = require('./config/firebase');
const { initSocketIO } = require('./sockets');
const { startScheduledJobs } = require('./utils/scheduler');

initFirebase();

const server = http.createServer(app);
initSocketIO(server);

server.listen(config.port, () => {
  console.log(`[LifeLink] Server running on port ${config.port} (${config.nodeEnv})`);
  startScheduledJobs();
});

process.on('SIGTERM', () => {
  console.log('[LifeLink] Shutting down...');
  server.close();
});

module.exports = server;
