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
  fn: () => T | Promise<T>,
  seconds = 60 * 60,
  ...args: []
): Promise<T> => {
  /**
   * The time the function started executing.
   */
  const startTime = Date.now();
  const cacheStore = new CacheStore<T>(name);
  /**
   * Await and write the new value.
   */
  const updateStore = async () => {
    const newValue = await fn(...args);
    return await cacheStore.write(newValue);
  };
  /**
   * Try to read from available caches. Clear all caches if an error is
   * encountered.
   */
  try {
    const mostRecentCache = await cacheStore.getMostRecentCache();
    const mostRecentTimestamp = !mostRecentCache
      ? 0
      : Number(mostRecentCache.name);
    /**
     * If no caches were found, write a new value.
     */
    if (!mostRecentCache) {
      console.log('No caches found.');
      return await updateStore();
    }
    /**
     * If caches were found, determine if they're stale.
     */
    const secondsOld = (Date.now() - mostRecentTimestamp) / 1000;
    const cacheIsStale = secondsOld >= seconds;
    console.log(`Caches found for store: ${name}`, { cacheIsStale, secondsOld });
    /**
     * If the cache is not stale, read the value and return it.
     */
    if (cacheIsStale) {
      console.log('Cache is stale.');
      return await updateStore();
    } else {
      console.log('Cache is not stale.');
      return await cacheStore.read();
    }
  } catch (error) {
    console.log(
      `Unrecoverable error. Files may be corrupted. Deleting all caches.`,
      error
    );
    await cacheStore.deleteCaches(true);
    throw new Error(`Error: ${error}`);
  } finally {
    console.log(`Finished in ${Date.now() - startTime}ms`);
  }
};
