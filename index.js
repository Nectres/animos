const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const serve = require("electron-serve");
const { startWebServer } = require("./anime-scraper");
const now = require("performance-now");
const { fetchPopular } = require("./anime-scraper/scraper/scrape");
const {
  standardGetInfo,
  standardSearch,
  standardEpisodeSrc,
  standardGetEpisodes,
} = require("./standard");

const loadPath = serve({ directory: "output" });

// const isDev = false
const timers = {};
function timeStart(timer) {
  timers[timer] = now();
}
function timeEnd(timer) {
  let ms = now() - timers[timer];
  console.log(`${timer}: ${ms.toFixed(3)}ms`);
  timers[timer] = null;
}

app.commandLine.appendSwitch("disable-pinch");

const isDev = !app.isPackaged;
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: __dirname + "/preload.js",
    },
    show:false,
    autoHideMenuBar: true,
  });

  let webContents = win.webContents;
  webContents.on("did-finish-load", () => {
    webContents.setZoomFactor(1);
  });

  win.maximize();

  if (isDev) {
    win.loadURL("http://localhost:5173/");
  } else {
    loadPath(win);
  }

  
  ipcMain.on('fullscreen', (event, makeFullscreen) => {
    win.setFullScreen(makeFullscreen)
 })
  win.show();
  win.focus();

};

ipcMain.handle("search-anime", async (event, keyw) => {
  let newDocs = await standardSearch(keyw);
  return newDocs;
});

ipcMain.handle("get-anime-info", async (event, animeId) => {
  console.log(`Searching for anime: ${animeId}`);
  let animeInfo = await standardGetInfo(animeId);
  console.log(animeInfo);
  return animeInfo;
});

ipcMain.handle("get-episodes", async (event, animeId) => {
  console.log(`Fetching episodes for ${animeId}`);
  let episodes = await standardGetEpisodes(animeId);
  console.dir(episodes);
  return episodes;
})

ipcMain.handle("get-popular-anime", async (event) => {
  let popularAnime = await fetchPopular({});
  console.dir(popularAnime);
  return popularAnime;
});

ipcMain.handle("get-episode", async (event, animeId, episodeId) => {
  let docs = await standardEpisodeSrc(animeId, episodeId);
  console.log(docs);
  return docs;
});

ipcMain.on("hello", (event, name, age) => {
  console.log(event);
  dialog.showMessageBox({
    message: `Hello ${name}! you are ${age} years old.`,
  });
});
app.whenReady().then(() => {
  startWebServer();
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
