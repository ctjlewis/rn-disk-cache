import { CacheStore } from './CacheStore';

interface FromDiskCacheArgs<T>{
  name: string;
  poll: (...args: any[]) => T | Promise<T>;
  maxAge?: number;
  silent?: boolean;
}

/**
 * Cache an object on the filesystem, given a `name`, `refresh` (can be async),
 * and `maxAge` (defaults to 1hr).
 *
 * Pass `silent: true` to disable logs.
 */
export const fromDiskCache = async <T>(
  {
    name,
    poll: refresh,
    maxAge = 60 * 60,
    silent = false,
  }: FromDiskCacheArgs<T>,
  ...args: any[]
): Promise<T> => {
  /**
   * Initialize a reference to this cache store.
   */
  const cacheStore = new CacheStore<T>(name, maxAge, silent);
  /**
   * Read a cached version of the value, or write a new one if it doesn't exist
   * and return that.
   */
  try {
    return await cacheStore.poll(refresh, ...args);
  } catch (error) {
    throw new Error(`Error refreshing cache: ${error}`);
  }
};