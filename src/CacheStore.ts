/**
 * @fileoverview
 * This file uses a class, which is a highly unpopular pattern nowadays, but was
 * necessary to avoid argument juggling between functions, and overall easier
 * state management.
 */

import { join } from 'path';
import fs from 'react-native-fs';

const {
  DocumentDirectoryPath,
  mkdir,
  readDir,
  readFile,
  unlink,
  writeFile,
} = fs;

/**
 * The directory where caches will be stored.
 */
const CACHE_DIR = join(DocumentDirectoryPath, '__caches__');

export class CacheStore<T> {
  /**
   * The path to this cache at ${CACHE_DIR}/{name}.
   */
  private cachePath: string;
  /**
   * Set the cache directory for this store.
   */
  constructor(
    private name: string,
    private maxAge: number,
    private silent = false
  ) {
    this.cachePath = join(CACHE_DIR, this.name);
  }
  /**
   * Try to read a non-stale cache, and if one doesn't exist, load a new one,
   * cache it, and return it.
   */
   public async refresh(
    fn: (...args: any[]) => T | Promise<T>,
    ...args: any[]
  ) {
    /**
     * The time the function started executing.
     */
    const startTime = Date.now();
    try {
      const nonStaleCache = await this.read();
      if (nonStaleCache) {
        const { value } = nonStaleCache;
        return value;
      } else {
        const { value } = await this.write(await fn(...args));
        return value;
      }
    } catch (error) {
      this.log(
        `Unrecoverable error. Files may be corrupted. Deleting all caches.`,
        error
      );
      await this.clean(true);
      throw new Error(`Error: ${error}`);
    } finally {
      this.log(`Finished in ${Date.now() - startTime}ms`);
    }
  }
  /**
   * Log messages and include the name of the cache.
   */
   private log(...msgs: any[]) {
    if (!this.silent) {
      console.log(`CACHE [${this.name}]`, ...msgs);
    }
  }
  /**
   * Ensure the cachePath exists, read any caches inside of it, and store it on
   * `this.caches`.
   */
  private async update() {
    /**
     * Make sure this cache directory exists.
     */
    await mkdir(this.cachePath);
    /**
     * Find available caches and sort them by increasing age.
     */
    const cachesInDir = await readDir(this.cachePath);
    const sortedCaches = cachesInDir.sort(
      (a, b) => Number(b.name) - Number(a.name)
    );

    return sortedCaches;
  }
  /**
   * Delete all caches except the most recent, unless `all: true` is
   * specified, in which case all caches will be deleted.
   */
  private async clean(all: boolean) {
    this.log(`Deleting ${all ? 'all' : 'old'} caches.`);

    const caches = await this.update();
    const cachesToDelete = all ? caches : caches.slice(1);
    await Promise.all(
      cachesToDelete.map(
        async (cache) => await unlink(cache.path)
      )
    );
  }
  /**
   * Try to read a non-stale cache value. If one is not found, return `null`.
   */
  private async read() {
    this.log('Reading most recent cache value.');
    const caches = await this.update();
    const mostRecentCache = caches[0];

    if (!mostRecentCache) {
      this.log('No caches found.');
      return null;
    }

    const mostRecentCacheTimestamp = Number(mostRecentCache.name);
    const mostRecentCacheAge = (Date.now() - mostRecentCacheTimestamp) / 1000;
    const mostRecentCacheIsStale = mostRecentCacheAge >= this.maxAge;

    this.log(`Cache found. Age: ${mostRecentCacheAge}s`);

    if (mostRecentCacheIsStale) {
      this.log('Cache is stale.');
      return null;
    } else {
      this.log('Cache is not stale.');
      const fileContents = await readFile(mostRecentCache.path);
      const value: T = JSON.parse(fileContents);
      /**
       * Return as an object to prevent issues if the cached value happened to be
       * `null`.
       */
      return { value };
    }
  };
  /**
   * Write the new value to the cache.
   */
  private async write(value: T) {
    this.log('Writing new cache value.');
    const file = join(this.cachePath, `${Date.now()}`);
    /**
     * Delete all except the most recent cache.
     */
    await this.clean(false);
    /**
     * Write new cache and return.
     */
    const serialized = JSON.stringify(value);
    await writeFile(file, serialized);

    return { value };
  };
}