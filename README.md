# React Native Disk Cache
Cache an object to disk, and refresh the value after a certain amount of time.

Under the hood, the data is stored as simple serialized `JSON.stringify()`
output, at a file located at `{DocumentDirectoryPath}/{store}/{timestamp}`.

### Example
```ts
import { fromDiskCache } from 'rn-disk-cache'

/**
 * Will be loaded live and written to disk, or read from disk cache if there is
 * a non-stale cache on-disk already.
 */
const value = await fromDiskCache(
  /** Name of this store. */
  'myLargeList',
  /** How to get the updated value when stale. */
  async () => {
    const update = await getValueOverNetworkOrOtherAsyncProcess();
    return update;
  },
  /** Cache duration. **/
  60,
);
```