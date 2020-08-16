import Bluebird from 'bluebird';

import { DataLoaderStorage } from './storage-abstraction';

export default class InMemoryStorage<V = any> implements DataLoaderStorage<V> {
  private map: Map<string, V>;

  constructor() {
    this.map = new Map();
  }

  async batchGet(keys: string[]) {
    const entities = [];

    for (const key of keys) {
      if (this.map.has(key)) {
        entities.push(this.map.get(key));
      }
    }

    return Bluebird.resolve(entities);
  }

  async set(key: string, value: V) {
    this.map.set(key, value);

    return Bluebird.resolve(value);
  }

  delete(key: string) {
    this.map.delete(key);

    return Bluebird.resolve();
  }
}
