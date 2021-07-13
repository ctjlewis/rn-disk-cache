/**
 * @fileoverview
 * This file uses a class, which is a highly unpopular pattern nowadays, but was
 * necessary to avoid argument juggling between functions, and overall easier
 * state management.
 */
export declare class CacheStore<T> {
    private name;
    private maxAge;
    private silent;
    /**
     * The path to this cache at ${CACHE_DIR}/{name}.
     */
    private cachePath;
    /**
     * Set the cache directory for this store.
     */
    constructor(name: string, maxAge: number, silent?: boolean);
    /**
     * Try to read a non-stale cache, and if one doesn't exist, load a new one,
     * cache it, and return it.
     */
    refresh(fn: (...args: any[]) => T | Promise<T>, ...args: any[]): Promise<T>;
    /**
     * Log messages and include the name of the cache.
     */
    private log;
    /**
     * Ensure the cachePath exists, read any caches inside of it, and store it on
     * `this.caches`.
     */
    private update;
    /**
     * Delete all caches except the most recent, unless `all: true` is
     * specified, in which case all caches will be deleted.
     */
    private clean;
    /**
     * Try to read a non-stale cache value. If one is not found, return `null`.
     */
    private read;
    /**
     * Write the new value to the cache.
     */
    private write;
}
