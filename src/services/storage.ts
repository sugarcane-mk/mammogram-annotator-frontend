/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for file storage that supports:
 * - Local filesystem storage (default for development)
 * - AWS S3
 * - Azure Blob Storage
 * - Google Cloud Storage
 * 
 * Can be configured via environment variables:
 * VITE_STORAGE_TYPE=local|s3|azure|gcs
 * VITE_STORAGE_BUCKET=bucket-name
 */

export type StorageType = 'local' | 's3' | 'azure' | 'gcs';

export interface StorageConfig {
  type: StorageType;
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  containerName?: string;
  projectId?: string;
}

export interface StorageObject {
  key: string;
  url: string;
  contentType: string;
  size: number;
  uploadedAt: number;
  metadata?: Record<string, string>;
}

interface StoredFile extends StorageObject {
  blob: Blob;
}

const toStorageObject = (record: StoredFile): StorageObject => ({
  key: record.key,
  url: record.url,
  contentType: record.contentType,
  size: record.size,
  uploadedAt: record.uploadedAt,
  metadata: record.metadata,
});

/**
 * Local Storage Implementation
 * Uses IndexedDB for client-side storage with file metadata
 */
class LocalStorageProvider {
  private dbName = 'MammogramStorageDB';
  private storeName = 'files';
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  async upload(
    file: File | Blob,
    key: string,
    metadata?: Record<string, string>
  ): Promise<StorageObject> {
    if (!this.db) throw new Error('Storage not initialized');

    const storageObject: StorageObject = {
      key,
      url: URL.createObjectURL(file),
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      uploadedAt: Date.now(),
      metadata,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put({
        ...storageObject,
        blob: file,
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(storageObject);
    });
  }

  async download(key: string): Promise<Blob> {
    if (!this.db) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error(`File not found: ${key}`));
        } else {
          resolve(request.result.blob);
        }
      };
    });
  }

  async getObject(key: string): Promise<StorageObject> {
    if (!this.db) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error(`File not found: ${key}`));
        } else {
          resolve(toStorageObject(request.result as StoredFile));
        }
      };
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async listObjects(prefix?: string): Promise<StorageObject[]> {
    if (!this.db) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const objects = (request.result as StoredFile[]).map(toStorageObject);
        const filtered = prefix
          ? objects.filter(obj => obj.key.startsWith(prefix))
          : objects;
        resolve(filtered);
      };
    });
  }
}

/**
 * AWS S3 Storage Implementation (placeholder for future implementation)
 */
class S3StorageProvider {
  constructor(_config: StorageConfig) {}

  async initialize(): Promise<void> {
    // Future: Initialize AWS SDK
    console.log('S3 Storage Provider initialized (placeholder)');
  }

  async upload(_file: File | Blob, _key: string, _metadata?: Record<string, string>): Promise<StorageObject> {
    // Future: Implement S3 upload using AWS SDK
    throw new Error('S3 Storage not yet implemented');
  }

  async download(_key: string): Promise<Blob> {
    // Future: Implement S3 download
    throw new Error('S3 Storage not yet implemented');
  }

  async getObject(_key: string): Promise<StorageObject> {
    // Future: Implement S3 get object
    throw new Error('S3 Storage not yet implemented');
  }

  async delete(_key: string): Promise<void> {
    // Future: Implement S3 delete
    throw new Error('S3 Storage not yet implemented');
  }

  async listObjects(_prefix?: string): Promise<StorageObject[]> {
    // Future: Implement S3 list objects
    throw new Error('S3 Storage not yet implemented');
  }
}

/**
 * Azure Blob Storage Implementation (placeholder for future implementation)
 */
class AzureStorageProvider {
  constructor(_config: StorageConfig) {}

  async initialize(): Promise<void> {
    console.log('Azure Storage Provider initialized (placeholder)');
  }

  async upload(_file: File | Blob, _key: string, _metadata?: Record<string, string>): Promise<StorageObject> {
    throw new Error('Azure Storage not yet implemented');
  }

  async download(_key: string): Promise<Blob> {
    throw new Error('Azure Storage not yet implemented');
  }

  async getObject(_key: string): Promise<StorageObject> {
    throw new Error('Azure Storage not yet implemented');
  }

  async delete(_key: string): Promise<void> {
    throw new Error('Azure Storage not yet implemented');
  }

  async listObjects(_prefix?: string): Promise<StorageObject[]> {
    throw new Error('Azure Storage not yet implemented');
  }
}

/**
 * Google Cloud Storage Implementation (placeholder for future implementation)
 */
class GCSStorageProvider {
  constructor(_config: StorageConfig) {}

  async initialize(): Promise<void> {
    console.log('GCS Storage Provider initialized (placeholder)');
  }

  async upload(_file: File | Blob, _key: string, _metadata?: Record<string, string>): Promise<StorageObject> {
    throw new Error('GCS Storage not yet implemented');
  }

  async download(_key: string): Promise<Blob> {
    throw new Error('GCS Storage not yet implemented');
  }

  async getObject(_key: string): Promise<StorageObject> {
    throw new Error('GCS Storage not yet implemented');
  }

  async delete(_key: string): Promise<void> {
    throw new Error('GCS Storage not yet implemented');
  }

  async listObjects(_prefix?: string): Promise<StorageObject[]> {
    throw new Error('GCS Storage not yet implemented');
  }
}

/**
 * Storage Factory
 * Creates and returns appropriate storage provider based on configuration
 */
class StorageFactory {
  private static providers: Map<StorageType, any> = new Map();
  private static config: StorageConfig;

  static initialize(config: Partial<StorageConfig> = {}): void {
    const storageType = (import.meta.env.VITE_STORAGE_TYPE || 'local') as StorageType;

    this.config = {
      type: storageType,
      bucket: import.meta.env.VITE_STORAGE_BUCKET,
      region: import.meta.env.VITE_STORAGE_REGION,
      ...config,
    };
  }

  static getProvider(): LocalStorageProvider | S3StorageProvider | AzureStorageProvider | GCSStorageProvider {
    const storageType = this.config?.type || 'local';

    if (!this.providers.has(storageType)) {
      let provider;
      switch (storageType) {
        case 's3':
          provider = new S3StorageProvider(this.config);
          break;
        case 'azure':
          provider = new AzureStorageProvider(this.config);
          break;
        case 'gcs':
          provider = new GCSStorageProvider(this.config);
          break;
        case 'local':
        default:
          provider = new LocalStorageProvider();
          break;
      }

      this.providers.set(storageType, provider);
    }

    return this.providers.get(storageType)!;
  }

  static async initializeProvider(): Promise<void> {
    const provider = this.getProvider();
    await provider.initialize();
  }
}

// Initialize storage factory
StorageFactory.initialize();

// Export storage instance
export const storage = {
  async upload(file: File | Blob, key: string, metadata?: Record<string, string>): Promise<StorageObject> {
    const provider = StorageFactory.getProvider();
    return provider.upload(file, key, metadata);
  },

  async download(key: string): Promise<Blob> {
    const provider = StorageFactory.getProvider();
    return provider.download(key);
  },

  async getObject(key: string): Promise<StorageObject> {
    const provider = StorageFactory.getProvider();
    return provider.getObject(key);
  },

  async delete(key: string): Promise<void> {
    const provider = StorageFactory.getProvider();
    return provider.delete(key);
  },

  async listObjects(prefix?: string): Promise<StorageObject[]> {
    const provider = StorageFactory.getProvider();
    return provider.listObjects(prefix);
  },

  async initialize(): Promise<void> {
    await StorageFactory.initializeProvider();
  },
};

export { StorageFactory, LocalStorageProvider, S3StorageProvider, AzureStorageProvider, GCSStorageProvider };
export default storage;
