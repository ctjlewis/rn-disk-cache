interface FromDiskCacheArgs<T> {
    name: string;
    poll: (...args: any[]) => T | Promise<T>;
    maxAge?: number;
    silent?: boolean;
}
/**
 * Cache an object on the filesystem, given a `name`, `refresh` (can be async),
 * and `maxAge` (defaults to 1hr).
 *
 * Pass `silent: true` to disable logs.
 */
export declare const fromDiskCache: <T>({ name, poll: refresh, maxAge, silent, }: FromDiskCacheArgs<T>, ...args: any[]) => Promise<T>;
export {};
