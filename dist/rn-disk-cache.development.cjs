'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var fs = require('react-native-fs');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);

/**
 * @fileoverview
 * This file uses a class, which is a highly unpopular pattern nowadays, but was
 * necessary to avoid argument juggling between functions.
 */
const { DocumentDirectoryPath, mkdir, readDir, readFile, unlink, writeFile, } = fs__default['default'];
/**
 * The directory where caches will be stored.
 */
const CACHE_DIR = path.join(DocumentDirectoryPath, '__caches__');
class CacheStore {
    name;
    /**
     * The path to this cache at ${CACHE_DIR}/{name}.
     */
    cachePath;
    /**
     * Set the cache directory for this store.
     */
    constructor(name) {
        this.name = name;
        this.cachePath = path.join(CACHE_DIR, this.name);
    }
    /**
     * Log messages and include the name of the cache.
     */
    log(...msgs) {
        console.log(`CACHE [${this.name}]`, ...msgs);
        return this;
    }
    /**
     * Delete all caches except the most recent, unless `clean: true` is
     * specified, in which case all caches will be deleted.
     */
    deleteCaches = async (clean) => {
        this.log(`Deleting ${clean ? 'all' : 'old'} caches.`);
        const caches = await this.getCaches();
        const cachesToDelete = clean ? caches : caches.slice(1);
        await Promise.all(cachesToDelete.map(async (cache) => await unlink(cache.path)));
        return this;
    };
    /**
     * List all caches in this store.
     */
    getCaches = async () => {
        /**
         * Make sure this cache directory exists.
         */
        await mkdir(this.cachePath);
        /**
         * Find available caches and sort them by increasing age.
         */
        const cacheResults = await readDir(this.cachePath);
        return cacheResults.sort((a, b) => Number(b.name) - Number(a.name));
    };
    /**
     * Get the most recent cache
     */
    getMostRecentCache = async () => {
        const caches = await this.getCaches();
        return caches[0];
    };
    /**
     * Read the most recent cached value.
     */
    read = async () => {
        this.log('Reading most recent cache value.');
        const mostRecentCache = await this.getMostRecentCache();
        const fileContents = await readFile(mostRecentCache.path);
        const cacheValue = JSON.parse(fileContents);
        return cacheValue;
    };
    /**
     * Write the new value to the cache.
     */
    write = async (cacheValue) => {
        this.log('Writing new cache value.');
        const cacheFile = path.join(this.cachePath, `${Date.now()}`);
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
}

/**
 * Cache an object on the filesystem for a given amount of time.
 *
 * @param name A tag that will be used to name the temp directory.
 * @param fn A function that returns, or Promise that resolves to, the object to
 * cache.
 * @param seconds The number of seconds to cache the object for.
 * @param args Passed to the async function via `await fn(...args)`.
 */
const fromDiskCache = async (name, fn, seconds = 60 * 60, ...args) => {
    /**
     * The time the function started executing.
     */
    const startTime = Date.now();
    const cacheStore = new CacheStore(name);
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
            cacheStore.log('No caches found.');
            return await updateStore();
        }
        /**
         * If caches were found, determine if they're stale.
         */
        const secondsOld = (Date.now() - mostRecentTimestamp) / 1000;
        const cacheIsStale = secondsOld >= seconds;
        cacheStore.log(`Cache found. Age: ${secondsOld}s`);
        /**
         * If the cache is not stale, read the value and return it.
         */
        if (cacheIsStale) {
            cacheStore.log('Cache is stale.');
            return await updateStore();
        }
        else {
            cacheStore.log('Cache is not stale.');
            return await cacheStore.read();
        }
    }
    catch (error) {
        cacheStore.log(`Unrecoverable error. Files may be corrupted. Deleting all caches.`, error);
        await cacheStore.deleteCaches(true);
        throw new Error(`Error: ${error}`);
    }
    finally {
        cacheStore.log(`Finished in ${Date.now() - startTime}ms`);
    }
};

exports.fromDiskCache = fromDiskCache;
//# sourceMappingURL=rn-disk-cache.development.cjs.map
