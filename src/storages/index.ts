import InMemoryStorage from './in-memory';
import { DataLoaderStorage } from './storage-abstraction';

export function resolveStorage<V>(storage: DataLoaderStorage<V> | string, storageOptions: any) {
  const storages = {
    'in-memory': new InMemoryStorage(),
  };

  if (typeof storage === 'string') {
    if (storage in storages) {
      return storages[storage];
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const storageConstructor = require(storage);

    return new storageConstructor(storageOptions);
  }

  return storage;
}
