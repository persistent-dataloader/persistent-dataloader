import Bluebird from 'bluebird';
import DataLoader from 'dataloader';
import stringify from 'json-stable-stringify';
import { indexBy, is, mapObjIndexed, mergeRight, pick, pipe, prop } from 'ramda';

import storages from './storages';
import { DataLoaderStorage } from './storages/storage-abstraction';

export interface PersistentDataLoaderOptions<K, V> extends DataLoader.Options<K, V> {
  /**
   * Persistent storage key prefix
   */
  keyPrefix?: string;
  /**
   * Disable persistency. Could be used for unit tests.
   */
  disablePersistency?: boolean;
  /**
   * Do not use cached data from persistent storage and force overwrite it with new data.
   */
  forceUpdateCache?: boolean;
  /**
   * Persistent DataLoader storage implementation or the name of storage.
   */
  storage?: DataLoaderStorage<V> | string;
  /**
   * Database name in storage to be used in case the storage option is storage name string.
   */
  databaseName?: string;
}

const pickDataloaderOptions = pick([
  'batch',
  'maxBatchSize',
  'cacheKeyFn',
]);

export class PersistentDataLoader<K, V> implements DataLoader<K, V> {
  private storageLoader: DataLoader<K, V>;
  private storageImpl: DataLoaderStorage<V>;
  private options: PersistentDataLoaderOptions<K, V>;

  constructor(batchLoadFn: DataLoader.BatchLoadFn<K, V>, options?: PersistentDataLoaderOptions<K, V>) {
    const defaultOptions: PersistentDataLoaderOptions<K, V> = {
      cacheKeyFn: k => is(Object, k) ? stringify(k) : k,
      storage: 'in-memory'
    };
    this.options = mergeRight(defaultOptions, options);

    const userLoader = new DataLoader<K, V>(batchLoadFn, {
      ...pickDataloaderOptions(this.options),
      cache: false,
    });

    interface KeyValueObj { key: string, value: V }
    const indexByKey = indexBy(prop('key')) as (list: KeyValueObj[]) => Record<keyof KeyValueObj, KeyValueObj>;
    const mapValues = mapObjIndexed<KeyValueObj, V>(prop('value'));

    this.storageImpl = typeof this.options.storage === 'string' ? storages(this.options.storage, this.options) : this.options.storage;

    if (!this.storageImpl) {
      throw new Error(`Storage implementation '${this.options.storage}' not found.`);
    }

    this.storageLoader = new DataLoader<K, V>(async keys => {
      if (this.options.disablePersistency || this.options.cache === false) {
        return userLoader.loadMany(keys);
      }

      let indexed: Record<string, V> = {};

      if (!this.options.forceUpdateCache) {
        const storageKeys = keys.map(k => this.makeStorageKey(k));
        const values: KeyValueObj[] = await this.storageImpl.batchGet(storageKeys);
        indexed = pipe(indexByKey, mapValues)(values);
      }

      return Bluebird.map(keys, async key => {
        const v = indexed[this.makeStorageKey(key)] ?? null;

        if (v === null) {
          const resp = await userLoader.load(key);
          return this.storageImpl.set(this.makeStorageKey(key), resp);
        }

        return v;
      });
    }, pick(['cache', 'cacheKeyFn'], this.options));
  }

  private makeStorageKey(key: K): string {
    return this.options.keyPrefix
      ? `${this.options.keyPrefix}:${this.options.cacheKeyFn(key)}`
      : this.options.cacheKeyFn(key);
  }

  load(key: K) {
    return this.storageLoader.load(key);
  }

  loadMany(keys: K[]) {
    return this.storageLoader.loadMany(keys);
  }

  prime(key: K, val: V) {
    if (this.options.disablePersistency) {
      return this.storageLoader.clear(key).prime(key, val);
    }

    this.storageImpl.set(this.makeStorageKey(key), val).then(v => this.storageLoader.clear(key).prime(key, v));

    return this;
  }

  clearAll(): this {
    throw new Error('Method not implemented.');
  }

  clear(key: K) {
    if (this.options.disablePersistency) {
      return this.storageLoader.clear(key);
    }

    this.storageImpl.delete(this.makeStorageKey(key)).then(() => this.storageLoader.clear(key));

    return this;
  }
}
