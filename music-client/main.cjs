const { app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')

function createWindow () {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        frame: false,
        webPreferences:{
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            webSecurity: false
        }
    })

    win.loadURL('http://localhost:5173')

    ipcMain.on('close-window', () =>{
        win.close()
    })

    ipcMain.on('minimize-window', () => {
        win.minimize()
    })
}

app.whenReady().then(() => {
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})