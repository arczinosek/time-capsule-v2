import type {
  PresignedUpload,
  StorageService,
  StoredObject,
} from '../../src/storage/storage.service.js';

/**
 * In-memory stand-in for StorageService in e2e tests that need no RustFS:
 * `.overrideProvider(StorageService).useValue(new FakeStorageService())`. A test "uploads"
 * with put(), as the browser would POST to storage.
 */
export class FakeStorageService implements Pick<
  StorageService,
  'createUpload' | 'head' | 'delete' | 'deleteMany' | 'getReadUrl'
> {
  readonly objects = new Map<string, StoredObject>();
  readonly deleted: string[] = [];

  createUpload(key: string, contentType: string): Promise<PresignedUpload> {
    return Promise.resolve({
      url: 'http://storage.test/time-capsule-media',
      fields: { key, 'Content-Type': contentType },
    });
  }

  put(key: string, object: StoredObject): void {
    this.objects.set(key, object);
  }

  head(key: string): Promise<StoredObject | null> {
    return Promise.resolve(this.objects.get(key) ?? null);
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    this.deleted.push(key);
    return Promise.resolve();
  }

  async deleteMany(keys: string[]): Promise<void> {
    for (const key of keys) await this.delete(key);
  }

  getReadUrl(key: string, contentType: string): Promise<string> {
    return Promise.resolve(
      `http://storage.test/time-capsule-media/${key}?response-content-type=${encodeURIComponent(contentType)}`,
    );
  }
}
