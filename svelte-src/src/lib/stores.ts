import { writable, type Writable } from "svelte/store";

export const accentClr = writable("");

export const coverAnimeFocus = writable(-1);

export const lockBody = writable(false);

export function createModal() {
  let store = writable(false);
  return {
    set: (val: boolean) => {
      if (val) {
        lockBody.set(true);
      } else {
        lockBody.set(false);
      }
      return store.set(val);
    },
    subscribe: store.subscribe,
    update: store.update,
  };
}

export const showSettings = createModal();

export const showDownloads = createModal();
