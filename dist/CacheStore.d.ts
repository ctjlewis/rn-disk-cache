/**
 * @fileoverview
 * This file uses a class, which is a highly unpopular pattern nowadays, but was
 * necessary to avoid argument juggling between functions.
 */
import fs from 'react-native-fs';
declare type Cache = fs.ReadDirItem;
export declare class CacheStore<T> {
    name: string;
    /**
     * The path to this cache at ${CACHE_DIR}/{name}.
     */
    private cachePath;
    /**
     * Set the cache directory for this store.
     */
    constructor(name: string);
    /**
     * Log messages and include the name of the cache.
     */
    log(...msgs: any[]): this;
    /**
     * Delete all caches except the most recent, unless `clean: true` is
     * specified, in which case all caches will be deleted.
     */
    deleteCaches: (clean: boolean) => Promise<this>;
    /**
     * List all caches in this store.
     */
    private getCaches;
    /**
     * Get the most recent cache
     */
    getMostRecentCache: () => Promise<Cache>;
    /**
     * Read the most recent cached value.
     */
    read: () => Promise<any>;
    /**
     * Write the new value to the cache.
     */
    write: (cacheValue: T) => Promise<T>;
}
export {};
