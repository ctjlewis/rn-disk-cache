import { CacheStore } from './CacheStore';

/**
 * Cache an object on the filesystem for a given amount of time.
 *
 * @param name A tag that will be used to name the temp directory.
 * @param fn A function that returns, or Promise that resolves to, the object to
 * cache.
 * @param seconds The number of seconds to cache the object for.
 * @param args Passed to the async function via `await fn(...args)`.
 */
export const fromDiskCache = async <T>(
  name: string,
  fn: (...args: any[]) => T | Promise<T>,
  seconds = 60 * 60,
  ...args: any[]
): Promise<T> => {
  /**
   * Initialize a reference to this cache store.
   */
  const cacheStore = new CacheStore<T>(name, seconds);
  /**
   * Read a cached version of the value, or write a new one if it doesn't exist
   * and return that.
   */
  try {
    return await cacheStore.refresh(fn, ...args);
  } catch (error) {
    throw new Error(`Error refreshing cache: ${error}`);
  }
};
