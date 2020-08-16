import DynamoDBStorage from './dynamodb';
import InMemoryStorage from './in-memory';

interface StorageOptions {
  databaseName?: string;
}

export default function(storageName: string, options: StorageOptions) {
  const storages = {
    'in-memory': new InMemoryStorage(),
    'dynamodb': new DynamoDBStorage(options.databaseName)
  };

  return storages[storageName];
}
