'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var fs = require('react-native-fs');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);

/**
 * @fileoverview
 * This file uses a class, which is a highly unpopular pattern nowadays, but was
 * necessary to avoid argument juggling between functions, and overall easier
 * state management.
 */
const { DocumentDirectoryPath, mkdir, readDir, readFile, unlink, writeFile, } = fs__default['default'];
/**
 * The directory where caches will be stored.
 */
const CACHE_DIR = path.join(DocumentDirectoryPath, '__caches__');
class CacheStore {
    name;
    maxAge;
    silent;
    /**
     * The path to this cache at ${CACHE_DIR}/{name}.
     */
    cachePath;
    /**
     *  The path to the lockfile for this store.
     */
    lockFile;
    /**
     * Set the cache directory for this store.
     */
    constructor(name, maxAge, silent = false) {
        this.name = name;
        this.maxAge = maxAge;
        this.silent = silent;
        this.cachePath = path.join(CACHE_DIR, this.name);
        this.lockFile = path.join(this.cachePath, '.lock');
    }
    /**
     * Log messages and include the name of the cache.
     */
    log(...msgs) {
        if (!this.silent) {
            console.log(`CACHE [${this.name}]`, ...msgs);
        }
    }
    /**
     * Write the lockfile.
     */
    async lock() {
        this.log('Locking cache store.');
        return await fs__default['default'].writeFile(this.lockFile, '');
    }
    /**
     * Delete the lockfile.
     */
    async unlock() {
        this.log('Unlocking cache store.');
        return await fs__default['default'].unlink(this.lockFile);
    }
    /**
     * Check if the lockfile exists.
     */
    async isLocked() {
        return await fs__default['default'].exists(this.lockFile);
    }
    /**
     * Returns a Promise that resolves when the lockfile is deleted.
     */
    async waitForUnlock() {
        this.log('Waiting for unlock...');
        return await new Promise((resolve) => {
        });
    }
    /**
     * Ensure the cachePath exists, and return any caches inside of it, sorted by
     * increasing age.
     */
    async getCaches() {
        /**
         * Make sure this cache directory exists.
         */
        await mkdir(this.cachePath);
        /**
         * Find available caches and sort them by increasing age.
         */
        const cachesInDir = await readDir(this.cachePath);
        const sortedCaches = cachesInDir
            .filter((f) => Number(f.name) !== NaN)
            .sort((a, b) => Number(b.name) - Number(a.name));
        return sortedCaches;
    }
    /**
     * Return the most recent valid cache where `age < maxAge`, else `null`.
     */
    async getValidCache() {
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
        }
        else {
            return null;
        }
    }
    /**
     * Delete all caches except the most recent, unless `all: true` is
     * specified, in which case all caches will be deleted.
     */
    async clean(all) {
        this.log(`Deleting ${all ? 'all' : 'old'} caches.`);
        const caches = await this.getCaches();
        const cachesToDelete = all ? caches : caches.slice(1);
        await Promise.all(cachesToDelete.map(async (cache) => await unlink(cache.path)));
    }
    /**
     * Try to read the most recent valid cache. Return `null` if none found.
     */
    async read() {
        const cache = await this.getValidCache();
        if (cache) {
            this.log('Valid cache found.');
            const fileContents = await readFile(cache.path);
            const value = JSON.parse(fileContents);
            /**
             * Return as an object to prevent issues if the cached value happened to be
             * `null`.
             */
            return { value };
        }
        else {
            return null;
        }
    }
    /**
     * Write the new value to the cache.
     */
    async write(value) {
        /**
         * If there's a valid cache, bail out and return that.
         */
        const cacheValue = await this.read();
        if (cacheValue) {
            this.log('Valid cache found while trying to write. Using that instead.');
            return cacheValue;
        }
        else {
            /**
             * Wait for unlock, then resume.
             */
            await this.waitForUnlock();
            this.log('Writing new cache value.');
            /**
             * Delete all except the most recent cache and set the lockfile.
             */
            await this.lock();
            await this.clean(false);
            /**
             * Write new cache and unlock the directory.
             */
            const file = path.join(this.cachePath, `${Date.now()}`);
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
    async poll(fn, ...args) {
        /**
         * The time the function started executing.
         */
        const startTime = Date.now();
        try {
            const cacheValue = await this.read();
            if (cacheValue) {
                const { value } = cacheValue;
                return value;
            }
            else {
                const { value } = await this.write(await fn(...args));
                return value;
            }
        }
        catch (error) {
            this.log(`Unrecoverable error. Files may be corrupted. Deleting all caches.`, error);
            await this.clean(true);
            throw new Error(`Error: ${error}`);
        }
        finally {
            this.log(`Finished in ${Date.now() - startTime}ms`);
        }
    }
}

/**
 * Cache an object on the filesystem, given a `name`, `refresh` (can be async),
 * and `maxAge` (defaults to 1hr).
 *
 * Pass `silent: true` to disable logs.
 */
const fromDiskCache = async ({ name, refresh, maxAge = 60 * 60, silent = false, }, ...args) => {
    /**
     * Initialize a reference to this cache store.
     */
    const cacheStore = new CacheStore(name, maxAge, silent);
    /**
     * Read a cached version of the value, or write a new one if it doesn't exist
     * and return that.
     */
    try {
        return await cacheStore.poll(refresh, ...args);
    }
    catch (error) {
        throw new Error(`Error refreshing cache: ${error}`);
    }
};

exports.fromDiskCache = fromDiskCache;
//# sourceMappingURL=rn-disk-cache.development.cjs.map
