const { ipcRenderer } = require('electron');

window.printCommand = () => {
  ipcRenderer.send('print');
};
