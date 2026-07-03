import type { JSONObject, JSONValue } from '@devbro/neko-helper';
import * as fs from 'fs';
import * as path from 'path';
import type { CacheProviderInterface } from '../CacheProviderInterface.mjs';
import { LockHandle } from '../../../neko-helper/dist/cjs';

/**
 * Configuration options for the file-based cache provider.
 */
export type FileCacheConfig = {
  /** Directory where cache files are stored (default: './cache') */
  cacheDirectory?: string;
  /** Default time to live in milliseconds (default: 3600000) */
  defaultTTL?: number;
  /** Interval in milliseconds for cleanup of expired entries (default: 300000) */
  cleanupInterval?: number;
};

/**
 * Represents a cached item stored in a file.
 */
interface CacheItem {
  /** The cached value */
  value: any;
  /** Timestamp when the item expires (milliseconds since epoch) */
  expiresAt?: number;
  /** Timestamp when the item was created (milliseconds since epoch) */
  createdAt: number;
}

/**
 * File-based cache provider that stores cache entries as JSON files.
 * Provides persistent caching with automatic cleanup of expired entries.
 */
export class FileCacheProvider implements CacheProviderInterface {
  private config: FileCacheConfig = {
    cacheDirectory: path.join(process.cwd(), 'cache'),
    defaultTTL: 3600 * 1000,
    cleanupInterval: 300 * 1000,
  };

  private cleanupTimer?: NodeJS.Timeout;

  /**
   * Creates a new FileCacheProvider instance.
   * @param config - Configuration options for the cache
   */
  constructor(config: FileCacheConfig = {}) {
    this.config = { ...this.config, ...config };

    this.ensureCacheDirectory();
    this.startCleanupTimer();
  }

  /**
   * Ensures the cache directory exists, creating it if necessary.
   */
  private ensureCacheDirectory(): void {
    try {
      fs.accessSync(this.config.cacheDirectory!);
    } catch {
      console.log('creating cache directory', this.config.cacheDirectory);
      fs.mkdirSync(this.config.cacheDirectory!, { recursive: true });
    }
  }

  /**
   * Starts the automatic cleanup timer for expired entries.
   */
  private startCleanupTimer(): void {
    if (this.config.cleanupInterval! > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredEntries().catch(console.error);
      }, this.config.cleanupInterval!);
    }
  }

  /**
   * Stops the automatic cleanup timer.
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Generates a safe file path for the given cache key.
   * @param key - The cache key
   * @returns The full file path for the cache entry
   */
  private getFilePath(key: string): string {
    // Create a safe filename from the key
    const safeKey = key.replace(/[^a-z0-9]/gi, '_');
    return path.join(this.config.cacheDirectory!, `${safeKey}.json`);
  }

  /**
   * Removes all expired cache entries from the cache directory.
   */
  private async cleanupExpiredEntries(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.config.cacheDirectory!);
      const now = Date.now();

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.cacheDirectory!, file);
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const item: CacheItem = JSON.parse(content);

            if (item.expiresAt && item.expiresAt < now) {
              await fs.promises.unlink(filePath);
            }
          } catch {
            // If file is corrupted, delete it
            await fs.promises.unlink(filePath).catch(() => {});
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Retrieves a value from the cache.
   * @param key - The cache key
   * @returns The cached value or undefined if not found or expired
   */
  async get(key: string): Promise<JSONObject | JSONValue | undefined> {
    const filePath = this.getFilePath(key);

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const item: CacheItem = JSON.parse(content);

      // Check if item has expired
      if (item.expiresAt && item.expiresAt < Date.now()) {
        await fs.promises.unlink(filePath).catch(() => {});
        return undefined;
      }

      return item.value;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Stores a value in the cache.
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async put(key: string, value: JSONObject | JSONValue, ttl?: number): Promise<void> {
    const filePath = this.getFilePath(key);
    const now = Date.now();
    const effectiveTTL = ttl ?? this.config.defaultTTL!;

    const item: CacheItem = {
      value,
      createdAt: now,
      expiresAt: effectiveTTL > 0 ? now + effectiveTTL * 1000 : undefined,
    };

    this.ensureCacheDirectory();
    await fs.promises.writeFile(filePath, JSON.stringify(item), 'utf-8');
  }

  /**
   * Deletes a value from the cache.
   * @param key - The cache key to delete
   */
  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);

    try {
      await fs.promises.unlink(filePath);
    } catch {
      // File doesn't exist, that's fine
    }
  }

  /**
   * Checks if a key exists in the cache and has not expired.
   * @param key - The cache key to check
   * @returns True if the key exists and is not expired, false otherwise
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Increments a numeric value in the cache atomically using file-based locking.
   * If the key doesn't exist or is expired, it starts from 0.
   * @param key - The cache key to increment
   * @param amount - The amount to increment by (default: 1)
   * @returns The new value after incrementing
   * @throws Error if lock cannot be acquired after maximum retries
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    const filePath = this.getFilePath(key);

    // Use a lock file to ensure atomicity
    const lockPath = `${filePath}.lock`;

    // Simple file-based locking mechanism
    let lockAcquired = false;
    let retries = 0;
    const maxRetries = 50;

    while (!lockAcquired && retries < maxRetries) {
      try {
        // Try to create lock file exclusively
        await fs.promises.writeFile(lockPath, '', { flag: 'wx' });
        lockAcquired = true;
      } catch {
        // Lock exists, wait a bit and retry
        await new Promise((resolve) => setTimeout(resolve, 10));
        retries++;
      }
    }

    if (!lockAcquired) {
      throw new Error('Failed to acquire lock for increment operation');
    }

    try {
      let currentValue = 0;
      let item: CacheItem | undefined;

      // Read current value
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const parsedItem = JSON.parse(content);

        // Check if item has expired
        if (parsedItem.expiresAt && parsedItem.expiresAt < Date.now()) {
          item = undefined;
        } else {
          item = parsedItem;
          currentValue = typeof parsedItem.value === 'number' ? parsedItem.value : 0;
        }
      } catch {
        // File doesn't exist or is corrupted, start from 0
      }

      // Calculate new value
      const newValue = currentValue + amount;

      // Write back with same TTL if it existed
      const now = Date.now();
      const newItem: CacheItem = {
        value: newValue,
        createdAt: item?.createdAt ?? now,
        expiresAt: item?.expiresAt,
      };

      await fs.promises.writeFile(filePath, JSON.stringify(newItem), 'utf-8');

      return newValue;
    } finally {
      // Release lock
      try {
        await fs.promises.unlink(lockPath);
      } catch {
        // Ignore errors when removing lock file
      }
    }
  }

  async getLock(key: string, ttl: number): Promise<LockHandle | undefined> {
    let c = await this.get('lock_' + key);
    if (c) {
      return undefined;
    }

    await this.put('lock_' + key, true, ttl);

    return {
      isExpired: async () => {
        let c = await this.get('lock_' + key);
        if (c) {
          return false;
        }
        return true;
      },
      release: async () => {
        await this.delete('lock_' + key);
      },
    };
  }
}
