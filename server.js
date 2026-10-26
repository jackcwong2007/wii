const { startGyroServer } = require('./gyro-server');

async function main() {
  const { phoneUrl } = await startGyroServer({
    onConnection: (connected) => console.log(connected ? 'phone connected' : 'phone disconnected'),
  });

  console.log('Controller: https://localhost:3000/controller/');
  console.log(`Phone on this Wi-Fi: ${phoneUrl}`);
}

main().catch((error) => {
  console.error('Could not start the gyroscope server:', error.message);
  process.exitCode = 1;
});