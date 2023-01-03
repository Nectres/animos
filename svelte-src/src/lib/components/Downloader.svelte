<script lang="ts">
  import { clickOutside } from "$lib/actions";
  import { accentClr, showDownloads } from "$lib/stores";
  import FaClose from "./FaClose.svelte";
  import IconBtn from "./IconBtn.svelte";
  import type { EpisodeWithSkip } from "$lib/types";
  import { onMount } from "svelte";

  export let episode: EpisodeWithSkip;

  enum State {
    Loading,
    Selecting,
    Downloading,
    Finished,
  }

  let currentState = State.Selecting;

  let selected = "filler";
  let isOpen = false;
  let percentDone: number;

  function toggleOpen() {
    isOpen = !isOpen;
  }

  async function handleResponse() {
    window.api.episode.download(
      episode.source,
      "",
      genDownloadName(episode),
      selected
    );
  }

  export function genDownloadName(episode: EpisodeWithSkip) {
    return "E" + episode.number + " - " + episode.title;
  }

  onMount(() => (currentState = State.Selecting));
</script>

{#if $showDownloads}
  <div
    style="background-color: #0006;"
    class="w-screen h-screen flex fixed top-0 left-0 z-10 justify-center items-center"
  >
    <div
      class="bg-opacity-90 rounded-md text-white"
      style="min-width: 45rem;"
      use:clickOutside
      on:outclick={() => showDownloads.set(false)}
    >
      <div
        id="header"
        class="flex bg-black justify-between rounded-t-md items-center"
      >
        <span />
        <span>Downloading {episode.title}...</span>
        <div class="bg-red-600 text-white rounded-tr-md">
          <IconBtn
            bgAccent={false}
            background="red"
            click={() => showDownloads.set(false)}
          >
            <div class="w-3">
              <FaClose />
            </div>
          </IconBtn>
        </div>
      </div>
      <div id="content" class="py-10 px-5 bg-dark-1 rounded-b-md bg-opacity-75">
        <div class="flex gap-2 items-center relative">
          {#if currentState == State.Selecting}
            {#await window.api.episode.getResolutions(episode.source)}
              <p>Loading episodes...</p>
            {:then resolutions}
              {#if resolutions.length == 0}
                <p>No selectable resolutions.</p>
              {:else}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div class:is-open={isOpen} on:click={toggleOpen}>
                  <p>Resolution options:</p>
                  <select>
                    {#each resolutions as item}
                      <option value={item} selected={selected === item}
                        >{item}</option
                      >
                    {/each}
                  </select>
                </div>
              {/if}
              <button
                style="background-color: {$accentClr};"
                class="absolute bottom-0 right-0"
                on:click={(_) => {
                  handleResponse();
                }}
              >
                Download
              </button>
            {/await}
          {:else if currentState == State.Downloading}
            <div>
              <p>Downloading... {percentDone}%</p>
              <div style="height: 24px;width:{percentDone}%" />
            </div>
          {:else if currentState == State.Finished}
            <div />
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
