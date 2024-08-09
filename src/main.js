const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const AutoLaunch = require('auto-launch');
const path = require('path');

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
    mainWindow = new BrowserWindow({
      width: 400,
      height: 600,
      
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true,
        contextIsolation: false,
      }
    });

    const appVersion = app.getVersion();
    const loadUrl = `https://client.rsvapp.com/print?standalone=true&version=${appVersion}`;

    function listPrinters() {
      mainWindow.webContents.getPrintersAsync().then(printers => {
          mainWindow.webContents.send('printers-list', printers);
      });
  }

  ipcMain.on('select-printer', (event, printerIndex) => {
      mainWindow.webContents.getPrintersAsync().then(printers => {
          if (printerIndex >= 0 && printerIndex < printers.length) {
              selectedPrinter = printers[printerIndex];
              console.log('Selected printer:', selectedPrinter);
              event.reply('printer-selected', selectedPrinter);
          }
      });
  });
  ipcMain.on('minimize-window', (event) => {
    mainWindow.minimize();
});
ipcMain.on('print', (event, options) => {
  mainWindow.webContents.print({ 
    deviceName: selectedPrinter.name, 
    silent: true, 
    printBackground: true 
  }, (success, failureReason) => {
    if (!success) 
      console.log('Fallo de impresión:', failureReason);
    else 
      console.log('Printing succeeded');
  });
});
ipcMain.on('print-iframe', (event, src) => {
  console.log("Se recibió un print de iframe");
  console.log("src es "+src);
  let printWindow = new BrowserWindow({ 
    show: false, 
    webPreferences: { 
      nodeIntegration: false 
    } 
  });
  printWindow.loadURL(src);

  printWindow.webContents.on('did-finish-load', () => {
    console.log("Se cargó el iframe para imprimir");
    console.log("La impresora destino es "+selectedPrinter.name);
    console.log(selectedPrinter);

    printWindow.webContents.print({ 
      deviceName: selectedPrinter.name, 
      silent: true, 
      printBackground: true,
      margins: { // Especificar los márgenes en pulgadas; puedes necesitar ajustar según tu impresora
        marginType: 'none',
        /*top: 0,
        bottom: 0,
        left: 0,
        right: 0*/
      },
      pageSize: { // Tamaño del papel
        width: 76000, // 80mm en micrómetros
        height: 3276000 // Altura variable según el contenido; puedes ajustarlo
      }
    }, (success, errorType) => {
      console.log("On printed");
      console.log(success);
      if (!success) console.error(errorType);
      printWindow.close();
    });
  });
});
mainWindow.webContents.on('did-finish-load', () => {
  listPrinters();
});
  // Manejo de errores de carga
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Error al cargar la página:', errorDescription);
    });
 
    // Manejo de errores en JavaScript
    mainWindow.webContents.on('crashed', () => {
    console.error('La ventana ha fallado');
    });

    mainWindow.webContents.on('unresponsive', () => {
    console.error('La ventana no responde');
    });

    mainWindow.loadURL(loadUrl);
    mainWindow.on('closed', () => mainWindow = null);

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function setupTray() {
  tray = new Tray(path.join(__dirname, '../build/icon.ico'))
  const contextMenu = Menu.buildFromTemplate([
        { label: 'Abrir', click: () => mainWindow.show() },
        { label: 'Buscar actualizaciones', click: () => checkForUpdates() },
        { label: 'Detener servicio', click: () => {
            isQuitting = true;
            app.quit();
        }}
    ]);
    tray.setToolTip('RSV Print Client');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (mainWindow === null || mainWindow.isDestroyed()) {
            createWindow();
        } else {
            mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

function setupAutoLaunch(){
  // Auto Launch
  let autoLaunch = new AutoLaunch({
    name: 'RSV Print Client',
    path: app.getPath('exe'),
  });
  autoLaunch.isEnabled().then(isEnabled => {
    if (!isEnabled) autoLaunch.enable();
  });
}

function setupAutoUpdater() {
    autoUpdater.checkForUpdatesAndNotify();

    setInterval(() => {
        if (!isQuitting) {
            autoUpdater.checkForUpdatesAndNotify();
        }
    }, 5 * 60 * 1000); // Check every 5 minutes

    autoUpdater.on('update-available', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Actualización disponible',
            message: 'Una nueva versión está disponible, y se va a instalar ahora.',
            buttons: ['OK']
        });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      console.log(log_message);
    });

    autoUpdater.on('update-downloaded', () => {
        autoUpdater.quitAndInstall();
    });

    autoUpdater.on('error', (err) => {
        console.error('Error in auto-updater:', err);
    });
}

function checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify();
}

app.on('ready', () => {
    createWindow();
    setupTray();
    setupAutoUpdater();
    setupAutoLaunch();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}