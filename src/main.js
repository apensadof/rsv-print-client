const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const AutoLaunch = require('auto-launch');
const path = require('path');
let selectedPrinter = null;
let mainWindow = null;
let isQuitting = false; // Variable para controlar el estado de cierre

/*app.on('before-quit', () => {
  app.isQuiting = true;
});*/

function createWindow(minimized = 0) {
  if (isQuitting) {
    console.log("Esta quitting");
    return; // No hacer nada si la aplicación está cerrándose
  }
  
  autoUpdater.checkForUpdatesAndNotify();

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

    //mainWindow.loadURL(`file://${__dirname}/index.html`);
    mainWindow.loadURL('https://client.rsvapp.com/print?standalone=true');
    mainWindow.setMenu(null);

    //mainWindow.webContents.openDevTools();

    
  // Minimizar la ventana una vez que esté lista
  if(minimized){
    mainWindow.once('ready-to-show', () => {
      mainWindow.minimize();
    });
  }
  // Evento de impresión
  
  /*
  ipcMain.on('print', (event, content) => {
    mainWindow.webContents.print({
      deviceName: selectedPrinter.name
    }, (success, errorType) => {
      if (!success) console.log(errorType);
    });
  });*/
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
  /*
  ipcMain.on('print', (event) => {
    mainWindow.webContents.print({ silent: true });
  });*/
  mainWindow.webContents.on('did-finish-load', () => {
    listPrinters();
  });
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
        event.preventDefault(); // Prevenir el cierre real de la ventana
        mainWindow.hide(); // Ocultar la ventana
    }
    // Si app.isQuiting es true, se permitirá el cierre normal
  });
  mainWindow.on('closed', () => {
      mainWindow = null;
  });
  /*mainWindow.on('closed', () => {
      mainWindow = null;
  });*/

  /*mainWindow.on('close', (event) => {
    if (!isQuitting) {
        event.preventDefault(); // Prevenir que la ventana se cierre
        mainWindow.hide(); // Opcional: esconde la ventana en vez de cerrar
        return false;
        mainWindow = null;

    }   
    if(!mainWindow)
      createWindow();
  });*/
  
}



app.on('ready', () => {
  if (process.platform === 'win32' ) {
    tray = new Tray(path.join(__dirname, '../build/icon.ico'))
    // tray.on('click', tray.popUpContextMenu)
    tray.on("click", ()=>{
      //tray.popUpContextMenu();
      if (mainWindow === null || mainWindow.isDestroyed()) {
        createWindow();
      } else {
        if(mainWindow.isMinimized())
          mainWindow.restore();
        mainWindow.focus(); // Opcional: enfocar la ventana si ya está abierta
      }
    });
  
    const menu = Menu.buildFromTemplate ([
      {
        label: 'Abrir nueva ventana',
        click: () => {
            createWindow();
        }
      },
      {
        label: 'Buscar actualizaciones',
        click: () => {
            autoUpdater.checkForUpdates();
        }
      },
      {
        label: 'Detener servicio',
        click() { 
          isQuitting = true; // Marcar que la app está cerrándose
          app.quit();
        }
      },
      
    ]);

    tray.setToolTip('RSV Print Client');
    tray.setContextMenu(menu);
  }

  let autoLaunch = new AutoLaunch({
    name: 'RSV Print Client',
    path: app.getPath('exe'),
  });

  autoLaunch.isEnabled().then((isEnabled) => {
    if (!isEnabled) autoLaunch.enable();
  });

  createWindow(1);
});
//app.whenReady().then(createWindow);

// Configura el logging
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available.');
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater. ' + err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});


// Evento disparado cuando hay una actualización disponible
autoUpdater.on('update-available', () => {
  console.log('Una nueva actualización está disponible.');
});

// Evento disparado cuando la actualización ha sido descargada y está lista para ser instalada
autoUpdater.on('update-downloaded', () => {
  console.log('Actualización descargada; se instalará en la próxima reiniciación');
  // Puedes forzar la instalación así:
  autoUpdater.quitAndInstall(); 
});
/*
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
*/
app.on('activate', () => {
  if (mainWindow === null) {
      createWindow();
  } else {
      mainWindow.show();
  }
});
/*
app.on('activate', () => {
  createWindow(); // Crear o mostrar la ventana cuando la app se activa
});
*/

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
