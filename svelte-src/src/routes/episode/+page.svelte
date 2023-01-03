<script lang="ts">
  import { page } from "$app/stores";
  import VideoPlayer from "$lib/components/VideoPlayer.svelte";
  import FaPlay from "svelte-icons/fa/FaPlay.svelte";
  import { onMount } from "svelte";
  import { State, type EpisodeWithSkip } from "$lib/types";
  import type { Episode } from "@prisma/client";
  import EpisodeProgress from "$lib/components/EpisodeProgress.svelte";
  import Downloader from "$lib/components/Downloader.svelte";
  import { showDownloads } from "$lib/stores";

  let animeId: number;
  let episodeNum: number;
  let episodePage: number;
  $: {
    console.log("Episode page changed:", episodePage);
  }
  let zeroEp = $page.url.searchParams.get("zeroEp");
  let totalEpisodes = parseInt(
    $page.url.searchParams.get("totalEpisode") ?? "0"
  );

  let result: {
    currentEp: EpisodeWithSkip;
    allEpisodes: Episode[];
  };

  let pageState: State = State.Loading;

  function changeEpisodePage(page: number) {
    if (page == Math.floor(episodeNum / 100)) return;
    let ep = page * 100 + 1;
    let url = `/episode?episodeId=${ep}&animeId=${animeId}&zeroEp=${zeroEp}&totalEpisode=${totalEpisodes}`;
    console.log(url);
    location.href = url;
  }

  async function fetchEpisodeSrc() {
    let params = $page.url.searchParams;
    let episodeTempId = params.get("episodeId");
    let animeTempId = params.get("animeId");
    if (!animeTempId || !episodeTempId) {
      location.href = "/";
      animeTempId = episodeTempId = "";
    }
    animeId = parseInt(animeTempId);
    episodeNum = parseInt(episodeTempId);

    episodePage = Math.floor(episodeNum / 100);
    let allEpisodes = (await window.api.episode.info(
      animeId,
      episodePage + 1
    )) as Episode[];
    let currentEp = await window.api.episode.get(animeId, episodeNum);
    if (currentEp.source == "fail")
      return (location.href = "/info?animeId=" + animeId);
    result = {
      currentEp,
      allEpisodes,
    };
    console.log("Current episode:")
    console.log(currentEp);
    window.api.system.rpc(currentEp.anime.title, `EP${currentEp.number}`);
    console.dir({ result });
    pageState = State.Finished;
  }

  onMount(fetchEpisodeSrc);
</script>

<svelte:window
  on:load={(_) => {
    console.log("loaded");
    document
      .getElementById(`ep-${result.currentEp.number}`)
      ?.scrollIntoView({ behavior: "smooth" });
  }}
/>

<section
  class="flex px-4 main-wrapper relative justify-evenly items-center overflow-hidden text-white"
  style="height: 100%;"
>
  <div class="rounded-lg my-10 video-container">
    {#if pageState == State.Loading}
      <div
        style="width: 60rem;"
        class="animate-pulse aspect-video flex flex-center bg-slate-700 rounded-lg"
      >
        <div class="w-10 text-slate-400">
          <FaPlay />
        </div>
      </div>
      <div class="mx-5 my-4">
        <div class="animate-pulse bg-slate-700 w-52 h-10 rounded-lg" />
      </div>
    {:else}
      <div class="overflow-y-auto">
        <div>
          <VideoPlayer
            episode={result.currentEp}
            hasNextEp={result.allEpisodes.some(
              (ep) => ep.number > result.currentEp.number
            )}
          />
        </div>

        <div class="mx-5 my-4">
          <div class="text-sm text-gray-100 my-4">
            Episode {result.currentEp.number}
          </div>
          <h3 class="text-xl font-bold">
            {result.currentEp.title}
          </h3>
          <br />
          <a
            href="#downloads"
            on:click={(_) => {
              showDownloads.set(true);
            }}>Download</a
          >
            <Downloader episode={result.currentEp} />
        </div>
      </div>
    {/if}
  </div>
  <div class="episodes-container pr-10 py-20">
    <div>
      <span class="text-2xl font-semibold">Episodes</span>
      {#if totalEpisodes > 100}
        <select
          on:input={(e) => changeEpisodePage(parseInt(e.currentTarget.value))}
          name="episode-page"
          class="bg-gray-200 h-fit w-fit text-sm ml-5 rounded-md"
          bind:value={episodePage}
        >
          {#each Array.from( { length: Math.ceil(totalEpisodes / 100) } ) as _, index}
            <option value={index}
              >{index * 100 + (zeroEp ? 0 : 1)} - {(index + 1) * 100}</option
            >
          {/each}
        </select>
      {/if}
    </div>
    <div class="flex gap-4 my-5 flex-col episode-wrapper overflow-y-auto">
      {#if pageState != State.Loading}
        {#each result.allEpisodes as ep (ep.number)}
          <a
            data-sveltekit-reload
            class="flex-grow "
            href="/episode?episodeId={ep.number}&animeId={animeId}"
          >
            <div
              id="ep-{ep.number}"
              style={ep.number == episodeNum
                ? "border: 3px solid var(--accent-color);"
                : ""}
              class="{ep.watchTime / (ep.length ?? 1) > 0.9
                ? 'opacity-50'
                : 'opacity-100'} cursor-pointer font-semibold flex gap-2 flex-col text-sm w-full text-left border-slate-400 border-2 rounded-md my-2 px-4 py-2"
            >
              <span class="my-4">{ep.number}. {ep.title}</span>
              {#if ep.length}
                <EpisodeProgress
                  length={ep.length ?? 0}
                  watched={ep.watchTime}
                />
              {/if}
            </div>
          </a>
        {/each}
      {:else}
        {#each Array.from({ length: 10 }) as _}
          <div
            class="bg-slate-700 h-8 w-full rounded-md animate-pulse my-2 px-3 py-2"
          />
        {/each}
      {/if}
    </div>
  </div>
</section>

<style>  
  .episodes-container {
    height: 100%;
    overflow-y: auto;
    width: 23rem;
  }

  @media (min-height: 1400px), (max-width: 750px) {
    .video-container {
      width: fit-content;
    }
    .episodes-container {
      width: 100%;
      @apply px-20 my-0 py-0 w-fit;
    }
    .main-wrapper {
      @apply flex-col;
    }
    .episode-wrapper {
      @apply flex-row flex-wrap;
    }
  }
</style>
