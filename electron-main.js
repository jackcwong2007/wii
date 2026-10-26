const { app, BrowserWindow } = require('electron');
const { startGyroServer } = require('./gyro-server');

let gyroServer;

// Trust the mkcert certificate for localhost only. Everything else is still checked.
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (new URL(url).hostname === 'localhost') {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

async function startApp() {
  const { server, phoneUrl, port } = await startGyroServer({
    port: 3000,
    onConnection: (connected) => console.log(connected ? 'phone connected' : 'phone disconnected'),
  });
  gyroServer = server;

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 420,
    title: 'Wii Cursor',
    backgroundColor: '#06080d',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await window.loadURL(`https://localhost:${port}/controller/`);

  console.log('Desktop controller: Wii Cursor window');
  console.log(`Phone on this Wi-Fi: ${phoneUrl}`);
}

app.whenReady().then(startApp).catch((error) => {
  console.error('Could not start Wii Cursor:', error.message);
  app.quit();
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  gyroServer?.close();
});