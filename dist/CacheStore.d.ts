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
     *  The path to the lockfile for this store.
     */
    private lockFile;
    /**
     * Set the cache directory for this store.
     */
    constructor(name: string, maxAge: number, silent?: boolean);
    /**
     * Log messages and include the name of the cache.
     */
    private log;
    /**
     * Write the lockfile.
     */
    private lock;
    /**
     * Delete the lockfile.
     */
    private unlock;
    /**
     * Check if the lockfile exists.
     */
    private isLocked;
    /**
     * Returns a Promise that resolves when the lockfile is deleted.
     */
    private waitForUnlock;
    /**
     * Ensure the cachePath exists, and return any caches inside of it, sorted by
     * increasing age.
     */
    private getCaches;
    /**
     * Return the most recent valid cache where `age < maxAge`, else `null`.
     */
    private getValidCache;
    /**
     * Delete all caches except the most recent, unless `all: true` is
     * specified, in which case all caches will be deleted.
     */
    private clean;
    /**
     * Try to read the most recent valid cache. Return `null` if none found.
     */
    private read;
    /**
     * Write the new value to the cache.
     */
    private write;
    /**
     * Try to read a non-stale cache, and if one doesn't exist, load a new one,
     * cache it, and return it.
     *
     * This is delayed by a random amount of time, up to 100ms, to support
     * concurrency.
     */
    poll(fn: (...args: any[]) => T | Promise<T>): Promise<T>;
}
