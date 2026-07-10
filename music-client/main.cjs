const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { execFile } = require('child_process') // Модуль для запуску exe файлів

let pyBackendProcess = null

// Функція для автоматичного запуску Python-сервера
function startBackend() {
  const isDev = !app.isPackaged
  let backendPath

  if (isDev) {
    // У режимі розробки ти як і раніше запускаєш Python вручну через термінал
    console.log("Режим розробки: Python бекенд очікується вручну.")
    return
  } else {
    // У готовому додатку беремо api.exe зі спеціальної папки ресурсів Electron
    backendPath = path.join(process.resourcesPath, 'api.exe')
  }

  pyBackendProcess = execFile(backendPath, (err, stdout, stderr) => {
    if (err) {
      console.error("Помилка фонового бекенду:", err)
    }
  })
}

function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false, 
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false 
    }
  })

  // Якщо додаток упаковано — завантажуємо локальний файл, інакше — localhost розробника
  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'))
  }
}

app.whenReady().then(() => {
  startBackend() // Запускаємо Python
  createWindow()  // Відкриваємо вікно
})

// КРИТИЧНО ВАЖЛИВО: коли користувач закриває плеєр, вбиваємо процес Python, щоб він не зависав у пам'яті ПК
app.on('will-quit', () => {
  if (pyBackendProcess) {
    pyBackendProcess.kill()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('close-window', () => { app.quit() })
ipcMain.on('minimize-window', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) win.minimize()
})