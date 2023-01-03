import { contextBridge, ipcRenderer } from "electron";
import type { Anime, Episode, Preferences } from "@prisma/client";
import type { EpisodeWithAnime, WindowState } from "../types";

const endpoints = {
  anime: {
    info: (kitsuId: number) =>
      ipcRenderer.invoke("anime:info", kitsuId) as Promise<Anime>,
    search: (filters: Record<string, string>, page: number) =>
      ipcRenderer.invoke("anime:search", filters, page) as Promise<{
        data: Anime[];
        totalItems: number;
        currentPage: number;
      }>,
    posters: () => ipcRenderer.invoke("anime:posters") as Promise<Anime[]>,
    genre: (name: string) =>
      ipcRenderer.invoke("anime:genre", name) as Promise<Anime[]>,
    recommendations: (kitsuId: number) =>
      ipcRenderer.invoke("anime:recommendations", kitsuId) as Promise<Anime[]>,
    related: (kitsuId: number) => ipcRenderer.invoke("anime:related", kitsuId),
    setLike: (kitsuId: number, liked: boolean) =>
      ipcRenderer.invoke("anime:like", kitsuId, liked),
    getUserRecommendations: () =>
      ipcRenderer.invoke("anime:user-recommendations"),
    getPopular: (page: number) => ipcRenderer.invoke("anime:popular", page),
    getGenre: (genre: string, page: number) =>
      ipcRenderer.invoke("anime:genre", genre, page),
    getGenreNames: () => ipcRenderer.invoke("anime:genre-names"),
    liked: () => ipcRenderer.invoke("anime:liked") as Promise<Anime[]>,
  },
  episode: {
    info: (kitsuId: number, page: number) =>
      ipcRenderer.invoke("episode:info", kitsuId, page),
    get: (kitsuId: number, episodeNum: number) =>
      ipcRenderer.invoke("episode:get", kitsuId, episodeNum),
    getSkipTimes: (kitsuId: number, episodeNum: number) =>
      ipcRenderer.invoke("episode:skip-times", kitsuId, episodeNum),
    setWatchTime: (kitsuId: number, episodeNum: number, watchTime: number) =>
      ipcRenderer.invoke(
        "episode:set-watchtime",
        kitsuId,
        episodeNum,
        watchTime
      ),
    setLength: (kitsuId: number, episodeNum: number, length: number) =>
      ipcRenderer.invoke("episode:set-length", kitsuId, episodeNum, length),
    getContinueWatching: () =>
      ipcRenderer.invoke("episode:get-continue-watching") as Promise<
        EpisodeWithAnime[]
      >,
    renewSource: (kitsuId: number, episodeNum: number) =>
      ipcRenderer.invoke("episode:renew-source", kitsuId, episodeNum),
    getHistory: (page: number) => ipcRenderer.invoke("episode:history", page),
    download: (episodeURL: string, outputDir: string, outputFileName: string, resolution: string) =>
      ipcRenderer.invoke("episode:download", episodeURL, outputDir, outputFileName, resolution),
    getResolutions: (url: string) =>
      ipcRenderer.invoke("episode:getResolutions", url),
  },
  system: {
    onGoto: (cb: (link: string) => void) => {
      ipcRenderer.on("goto", (event, link) => {
        cb(link);
      });
    },
    window: (type: WindowState) => ipcRenderer.send("system:window", type),
    getPreferences: () =>
      ipcRenderer.invoke("system:get-preferences") as Promise<Preferences>,
    setPreferences: (update: Record<string, any>) =>
      ipcRenderer.invoke("system:set-preferences", update),
    getUpdates: () =>
      ipcRenderer.invoke("system:get-updates") as Promise<{
        version: string;
        available: boolean;
        releaseNotes: string;
      }>,
    rpc: (title: string, subtitle: string) => {
      ipcRenderer.send("system:rpc", title, subtitle);
    },
    downloadUpdate: () => ipcRenderer.invoke("system:download-update"),
    onProgress: (cb: (val: number) => void) => {
      ipcRenderer.on("download-progress", (event, val) => cb(val));
    },
  },
};

export type EndpointType = typeof endpoints;

contextBridge.exposeInMainWorld("api", endpoints);
