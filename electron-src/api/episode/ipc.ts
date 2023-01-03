import { ipcMain } from "electron";
import { db } from "../../db";
import {
  getEpisodes,
  getSkipTimes,
  getEpisode,
  renewSource,
  getHistory,
} from "./index";
import { checkEpisodeResolutions } from "./utils";
import { downloadEpisode } from "./download";

ipcMain.handle("episode:info", async (event, kitsuId: number, page: number) => {
  let result = await getEpisodes(kitsuId, page);
  return result;
});

ipcMain.handle(
  "episode:skip-times",
  async (event, kitsuId: number, episodeNum: number) => {
    let result = await getSkipTimes(kitsuId, episodeNum);
    return result;
  }
);

ipcMain.handle(
  "episode:get",
  async (event, kitsuId: number, episodeNum: number) => {
    let result = await getEpisode(kitsuId, episodeNum);
    return result;
  }
);

ipcMain.handle(
  "episode:set-watchtime",
  async (event, kitsuId: number, episodeNum: number, watchTime: number) => {
    await db.episode.update({
      data: {
        watchTime,
      },
      where: {
        animeKitsuId_number: {
          animeKitsuId: kitsuId,
          number: episodeNum,
        },
      },
    });
  }
);

ipcMain.handle("episode:get-continue-watching", async (event) => {
  let episodes = await db.episode.findMany({
    select: {
      watchTime: true,
      length: true,
      number: true,
      anime: true,
    },
    distinct: "animeKitsuId",
    take: 5,
    where: {
      length: {
        not: null,
      },
      watchTime: {
        gt: 0,
      },
    },
    orderBy: {
      lastUpdated: "desc",
    },
  });
  return episodes;
});

ipcMain.handle(
  "episode:renew-source",
  async (event, kitsuId: number, episodeNum: number) => {
    let source = await renewSource(kitsuId, episodeNum);
    return source;
  }
);

ipcMain.handle(
  "episode:set-length",
  async (event, animeKitsuId: number, episodeNum: number, length: number) => {
    await db.episode.update({
      where: {
        animeKitsuId_number: {
          animeKitsuId,
          number: episodeNum,
        },
      },
      data: {
        length,
      },
    });
    return;
  }
);

ipcMain.handle("episode:history", async (event, page: number) => {
  let result = await getHistory(page);
  return result;
});

ipcMain.handle(
  "episode:download",
  (
    event,
    episodeURL: string,
    outputDir: string,
    outputFileName: string,
    resolution: string
  ) => {
    downloadEpisode(episodeURL, outputDir, outputFileName, resolution);
  }
);

ipcMain.handle("episode:getResolutions", (event, url: string) => {
  return checkEpisodeResolutions(url);
});
