'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var fs = require('react-native-fs');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);

const { DocumentDirectoryPath, mkdir, readDir, readFile, unlink, writeFile, } = fs__default['default'];
/**
 * The directory where caches will be stored.
 */
const CACHE_DIR = path.join(DocumentDirectoryPath, '__caches__');
/**
 * Cache an object on the filesystem for a given amount of time.
 *
 * @param name A tag that will be used to name the temp directory.
 * @param fn A function that returns, or Promise that resolves to, the object to
 * cache.
 * @param seconds The number of seconds to cache the object for.
 */
const fromDiskCache = async (name, fn, seconds = 60 * 60) => {
    /**
     * The path to this cache, i.e. ${CACHE_DIR}/myCache. Create it if it doesn't
     * exist.
     */
    const cachePath = path.join(CACHE_DIR, name);
    await mkdir(cachePath);
    /**
     * Available caches in this store.
     */
    const cacheResults = await readDir(cachePath);
    const caches = cacheResults.sort((a, b) => Number(b.name) - Number(a.name));
    /**
     * The most recent available cached value.
     */
    const mostRecentCache = caches[0];
    /**
     * The timestamp for the most recent cached value.
     */
    const mostRecentTimestamp = !mostRecentCache
        ? 0
        : Number(mostRecentCache.name);
    /**
     * Read the most recent cached value.
     */
    const readCache = async () => {
        console.log('Reading most recent cache value.');
        const cacheFile = path.join(cachePath, mostRecentCache.name);
        const cacheValue = JSON.parse(await readFile(cacheFile));
        return cacheValue;
    };
    /**
     * Write the new value to the cache.
     */
    const writeCache = async () => {
        console.log('Writing new cache value.');
        const cacheValue = await fn();
        const cacheTimestamp = Date.now();
        const cacheFile = path.join(cachePath, `${cacheTimestamp}`);
        const serialized = JSON.stringify(cacheValue);
        /**
         * Delete all existing caches.
         */
        if (caches.length > 1) {
            console.log('Deleting old caches.');
            const cachesToDelete = caches.slice(1);
            await Promise.all(cachesToDelete.map(async (cache) => await unlink(cache.path)));
        }
        /**
         * Write new cache and return.
         */
        await writeFile(cacheFile, serialized);
        return cacheValue;
    };
    /**
     * If no caches were found, write a new value.
     */
    if (!caches.length) {
        console.log('No caches found.');
        return await writeCache();
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
        return await writeCache();
    }
    else {
        console.log('Cache is not stale.');
        return await readCache();
    }
};

exports.fromDiskCache = fromDiskCache;
//# sourceMappingURL=rn-disk-cache.development.cjs.map
