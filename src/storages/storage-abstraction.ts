export interface DataLoaderStorage<V = any> {
  batchGet(keys: string[]): Promise<V[]>;
  set(key: string, value: V): Promise<V>;
  delete(key: string): Promise<void>;
}
