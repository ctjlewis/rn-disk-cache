/**
 * Cache an object on the filesystem for a given amount of time.
 *
 * @param name A tag that will be used to name the temp directory.
 * @param fn A function that returns, or Promise that resolves to, the object to
 * cache.
 * @param seconds The number of seconds to cache the object for.
 */
export declare const fromDiskCache: <T>(name: string, fn: () => T | Promise<T>, seconds?: number) => Promise<T>;
