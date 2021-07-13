/**
 * @fileoverview
 * This file uses a class, which is a highly unpopular pattern nowadays, but was
 * necessary to avoid argument juggling between functions.
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

type Cache = fs.ReadDirItem;

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
  constructor(public name: string) {
    this.cachePath = join(CACHE_DIR, this.name);
  }
  /**
   * List all caches in this store.
   */
  private getCaches = async (): Promise<Cache[]> => {
    /**
     * Make sure this cache directory exists.
     */
    await mkdir(this.cachePath);
    /**
     * Find available caches and sort them by increasing age.
     */
    const cacheResults = await readDir(this.cachePath);
    return cacheResults.sort(
      (a, b) => Number(b.name) - Number(a.name)
    );
  }
  /**
   * Get the most recent cache 
   */
  public getMostRecentCache = async (): Promise<Cache> => {
    const caches = await this.getCaches();
    return caches[0];
  };
  /**
   * Read the most recent cached value.
   */
  public read = async () => {
    console.log('Reading most recent cache value.');
    const mostRecentCache = await this.getMostRecentCache();
    const fileContents = await readFile(mostRecentCache.path);
    const cacheValue = JSON.parse(fileContents);
    return cacheValue;
  };
  /**
   * Write the new value to the cache.
   */
  public write = async (cacheValue: T) => {
    console.log('Writing new cache value.');
    const cacheFile = join(this.cachePath, `${Date.now()}`);
    /**
     * Delete all except the most recent cache.
     */
    await this.deleteCaches(false);
    /**
     * Write new cache and return.
     */
    const serialized = JSON.stringify(cacheValue);
    await writeFile(cacheFile, serialized);
    return cacheValue;
  };
  /**
   * Delete all caches except the most recent, unless `clean: true` is
   * specified, in which case all caches will be deleted.
   */
  public deleteCaches = async (clean: boolean) => {
    console.log(`Deleting ${clean ? 'all' : 'old'} caches.`);
    const caches = await this.getCaches();
    const cachesToDelete = clean ? caches : caches.slice(1);
    await Promise.all(
      cachesToDelete.map(
        async (cache) => await unlink(cache.path)
      )
    );
  }
}