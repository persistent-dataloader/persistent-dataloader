export interface DataLoaderStorage<V> {
  batchGet(keys: string[]): Promise<{ key: string, value: V }[]>;
  set(key: string, value: V): Promise<V>;
  delete(key: string): Promise<void>;
}
