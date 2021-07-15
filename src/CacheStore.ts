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
   *  The path to the lockfile for this store.
   */
  private lockFile: string;
  /**
   * Set the cache directory for this store.
   */
  constructor(
    private name: string,
    private maxAge: number,
    private silent = false
  ) {
    this.cachePath = join(CACHE_DIR, this.name);
    this.lockFile = join(this.cachePath, '.lock');
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
   * Write the lockfile.
   */
  private async lock() {
    this.log('Locking cache store.');
    return await fs.writeFile(this.lockFile, '');
  }
  /**
   * Delete the lockfile.
   */
  private async unlock() {
    this.log('Unlocking cache store.')
    return await fs.unlink(this.lockFile);
  }
  /**
   * Check if the lockfile exists.
   */
  private async isLocked() {
    return await fs.exists(this.lockFile);
  }
  /**
   * Returns a Promise that resolves when the lockfile is deleted.
   */
  private async waitForUnlock() {
    this.log('Waiting for unlock...');
    return await new Promise(async (resolve) => {
      const checkForUnlock = async () => {
        if (!(await this.isLocked())) {
          resolve(true);
        } else {
          setTimeout(checkForUnlock, 100 * Math.random());
        }
      }
      /**
       * Start checking for a missing lockfile. If a minute passes with no
       * unlock, assume the process was interrupted and delete it.
       */
      // setTimeout(async () => await this.unlock(), 60 * 1000);
      await checkForUnlock();
    });
  }
  /**
   * Ensure the cachePath exists, and return any caches inside of it, sorted by
   * increasing age.
   */
  private async getCaches() {
    /**
     * Make sure this cache directory exists.
     */
    await mkdir(this.cachePath);
    /**
     * Find available caches and sort them by increasing age.
     */
    const cachesInDir = await readDir(this.cachePath);
    const sortedCaches =
      cachesInDir
        .filter((f) => Number(f.name) !== NaN)
        .sort((a, b) => Number(b.name) - Number(a.name));

    return sortedCaches;
  }
  /**
   * Return the most recent valid cache where `age < maxAge`, else `null`.
   */
  private async getValidCache() {
    this.log('Reading most recent cache value.');

    const caches = await this.getCaches();
    const mostRecentCache = caches[0];

    if (!mostRecentCache) {
      this.log('No caches found.');
      return null;
    }

    const mostRecentCacheTimestamp = Number(mostRecentCache.name);
    const mostRecentCacheAge = (Date.now() - mostRecentCacheTimestamp) / 1000;
    const mostRecentCacheIsStale = mostRecentCacheAge >= this.maxAge;

    this.log(`Cache found. Age: ${mostRecentCacheAge} sec`);

    if (!mostRecentCacheIsStale) {
      return mostRecentCache;
    } else {
      return null;
    }
  }
  /**
   * Delete all caches except the most recent, unless `all: true` is
   * specified, in which case all caches will be deleted.
   */
  private async clean(all: boolean) {
    this.log(`Deleting ${all ? 'all' : 'old'} caches.`);

    const caches = await this.getCaches();
    const cachesToDelete = all ? caches : caches.slice(1);
    await Promise.all(
      cachesToDelete.map(
        async (cache) => await unlink(cache.path)
      )
    );
  }
  /**
   * Try to read the most recent valid cache. Return `null` if none found.
   */
  private async read() {
    const cache = await this.getValidCache();
    if (cache) {
      this.log('Valid cache found.');
      const fileContents = await readFile(cache.path);
      const value: T = JSON.parse(fileContents);
      /**
       * Return as an object to prevent issues if the cached value happened to be
       * `null`.
       */
      return { value };
    } else {
      return null;
    }
  }
  /**
   * Write the new value to the cache.
   */
  private async write(value: T) {
    /**
     * If there's a valid cache, bail out and return that.
     */
    const cacheValue = await this.read();
    if (cacheValue) {
      this.log('Valid cache found while trying to write. Using that instead.');
      return cacheValue;
    } else {
      /**
       * Wait for unlock, then resume.
       */
      await this.waitForUnlock();
      /**
       * Delete all except the most recent cache and set the lockfile.
       */
      await this.lock();
      await this.clean(false);
      /**
       * Write new cache and unlock the directory.
       */
      this.log('Writing new cache value.');
      const file = join(this.cachePath, `${Date.now()}`);
      const serialized = JSON.stringify(value);
      await writeFile(file, serialized);
      await this.unlock();

      return { value };
    }
  }
  /**
   * Try to read a non-stale cache, and if one doesn't exist, load a new one,
   * cache it, and return it.
   *
   * This is delayed by a random amount of time, up to 100ms, to support
   * concurrency.
   */
  public async poll(
    fn: (...args: any[]) => T | Promise<T>,
    ...args: any[]
  ) {
    /**
     * The time the function started executing.
     */
    const startTime = Date.now();
    try {
      const cacheValue = await this.read();
      if (cacheValue) {
        const { value } = cacheValue;
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
}