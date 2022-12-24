import { Anime } from "@prisma/client";
import axios from "axios";
import { load } from "cheerio";
import { db } from "../../db";
import { headerOption } from "../scraper/helper";
import { httpGet } from "../utils";
import { compareTwoStrings } from "string-similarity";

export function transformKitsuToAnime(kitsuData: Record<string, any>): Anime {
  let anime: any = {};
  let { attributes: data } = kitsuData;
  anime.synopsis = data.synopsis;
  anime.kitsuId = parseInt(kitsuData.id);
  anime.title_en = data.titles.en_us ?? data.titles.en;
  anime.title_jp = data.titles.en_jp;
  anime.ageRating = data.ageRating ?? "G";
  anime.title = data.canonicalTitle;
  anime.type = data.subtype;
  anime.posterImg = data.posterImage?.large ?? "";
  anime.coverImg = data.coverImage?.large ?? "";
  anime.genres = "";
  anime.score = parseInt(data.averageRating ?? "0") / 10;
  anime.episodes = data.episodeCount;
  return anime;
}

export async function getEpInfo(slug: string) {
  const res = await axios.get(
    `https://gogoanime.consumet.org/anime-details/${slug}`,
    headerOption
  );
  let zeroEpisode = parseInt(res.data.episodesList.reverse()[0].episodeNum) === 0;
  let totalEpisodes = parseInt(res.data.totalEpisodes);
  return {
    zeroEpisode,
    totalEpisodes,
  };
}

export async function getGenres(kitsuId: number) {
  let response = await httpGet(
    `https://kitsu.io/api/edge/anime/${kitsuId}/categories?sort=-totalMediaCount`
  );
  let genreArr = response.data
    .map((data) => data.attributes.title)
    .slice(0, 5)
    .sort();
  return genreArr.join(",");
}

export async function getPartialInfo(
  anime: Anime,
  kitsuSlug: string
): Promise<Anime> {
  console.log("Slug:", kitsuSlug);
  if (!anime.malId) anime.malId = await getMalId(anime.kitsuId);

  if (anime.genres == "") anime.genres = await getGenres(anime.kitsuId);
  anime.available = true;
  try {
    // This part actually is still active in the animixplay api, but i suspect it won't be for soon, so
    // it should quickly be removed and replaced with something else.
    if (!anime.slug && anime.malId && anime.malId > 0) {
      let animix = `https://animixplay.to/assets/rec/${anime.malId}.json`;
      let result = await httpGet(animix);
      if (result["Gogoanime"]) {
        let slugs = result["Gogoanime"].map((obj) => obj.url.split("/").pop());
        anime.slug = slugs[0];
        anime.dubSlug = slugs[1];
      }
    }
    if (!anime.slug) {
      anime.slug = await getAlternativeSlug(
        kitsuSlug,
        anime.title || anime.title_en || anime.title_jp
      );
    }
    console.log({ slug: anime.slug });
    console.log(
      "Fetching episodes for ",
      anime.kitsuId,
      anime.slug,
      anime.episodes
    );

    if (anime.slug) {
      let epInfo = await getEpInfo(anime.slug);

      console.log("received episodes from eplist");
      console.log(epInfo);
      anime.zeroEpisode = epInfo.zeroEpisode;
      anime.episodes = epInfo.totalEpisodes;
    }
    return anime;
  } catch {
    // either error at json conversion for anime with no episode sources / no mal id and no gogoanime slug
    anime = await db.anime.create({
      data: {
        available: false,
        ageRating: "G",
        genres: "",
        episodes: 0,
        kitsuId: anime.kitsuId,
        posterImg: "",
        title: "",
        score: 0,
        synopsis: "",
      },
    });
    return anime;
  }
}

export function getGenresFromIncluded(included) {
  let genresObjs = included.filter((obj) => obj.type == "categories");
  console.log(
    genresObjs.map((obj) => {
      return {
        name: obj.attributes.title,
        count: obj.attributes.totalMediaCount,
      };
    })
  );
  return genresObjs
    .sort((a, b) => b.attributes.totalMediaCount - a.attributes.totalMediaCount)
    .map((obj) => obj.attributes.title);
}

export function getMalIdFromIncluded(included) {
  let malId = included.filter(
    (obj) => obj.attributes.externalSite == "myanimelist/anime"
  )[0];
  if (!malId) return -1;
  return parseInt(malId.attributes.externalId);
}

export async function getMalId(kitsuId: number) {
  let res = await httpGet(
    `https://kitsu.io/api/edge/anime/${kitsuId}/mappings`
  );
  let data = res.data.filter(
    (obj) => obj.attributes.externalSite == "myanimelist/anime"
  )[0];
  console.log(data);
  console.log(data.attributes.externalId);
  return parseInt(data.attributes.externalId);
}

function significantParts(word: string) {
  if (!word) return word;
  word = word.replace(/[!@#$%^&*():-]/g, "");
  let articles = ["the", "a", "an", "in"];
  let nw = word
    .split(" ")
    .filter((o) => !articles.includes(o.toLowerCase()))
    .join(" ");
  return nw.toLowerCase();
}

async function getAlternativeSlug(kitsuSlug: string, kitsuTitle: string) {
  let resp = await axios.get(
    `https://gogoanime.tel/search.html?keyword=${kitsuSlug}`
  );
  console.log(`Fetching slug for ${kitsuSlug}`);
  console.log(kitsuTitle);
  const $ = load(resp.data);
  let sigTitle = significantParts(kitsuTitle);
  let slug = "";
  $("p.name > a").each((i, elem) => {
    let animeTitle = $(elem).text();
    let sigAnime = significantParts(animeTitle);
    if (!slug && compareTwoStrings(sigAnime, sigTitle) > 0.65) {
      slug = $(elem).attr("href").split("/")[2];
    }
  });
  console.log(`best match for ${kitsuTitle}: ${slug}`);
  return slug;
}
