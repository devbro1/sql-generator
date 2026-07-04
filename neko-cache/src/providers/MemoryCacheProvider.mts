import type { JSONObject, JSONValue, LockHandle } from '@devbro/neko-helper';
import type { CacheProviderInterface } from '../CacheProviderInterface.mjs';

/**
 * Configuration options for the in-memory cache provider.
 */
export type MemoryCacheConfig = {
  /** Maximum number of items to store in cache (default: 1000) */
  maxSize?: number;
  /** Default time to live in seconds (default: 3600) */
  defaultTTL?: number;
  /** Interval in seconds to run cleanup of expired entries (default: 600) */
  cleanupInterval?: number;
};

/**
 * Represents a cached item with metadata.
 */
interface CacheItem {
  /** The cached value */
  value: any;
  /** Timestamp when the item expires (milliseconds since epoch) */
  expiresAt?: number;
  /** Timestamp when the item was created (milliseconds since epoch) */
  createdAt: number;
  /** Timestamp when the item was last accessed (milliseconds since epoch) */
  lastAccessed: number;
}

/**
 * In-memory cache provider with LRU eviction and automatic cleanup.
 * Stores cache entries in memory with support for TTL and size limits.
 */
export class MemoryCacheProvider implements CacheProviderInterface {
  private cache = new Map<string, CacheItem>();
  private config: MemoryCacheConfig = {
    maxSize: 1000,
    defaultTTL: 3600,
    cleanupInterval: 600, // 10 minutes
  };

  private cleanupTimer?: NodeJS.Timeout;

  /**
   * Creates a new MemoryCacheProvider instance.
   * @param config - Configuration options for the cache
   */
  constructor(config: MemoryCacheConfig = {}) {
    this.config = { ...this.config, ...config };

    this.startCleanupTimer();
  }

  /**
   * Starts the automatic cleanup timer for expired entries.
   */
  private startCleanupTimer(): void {
    if (this.config.cleanupInterval! > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredEntries();
      }, this.config.cleanupInterval! * 1000);
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
   * Removes all expired entries from the cache.
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evicts the least recently used item if cache size exceeds maximum.
   */
  private evictLRU(): void {
    if (this.cache.size <= this.config.maxSize!) {
      return;
    }

    // Find the least recently accessed item
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Retrieves a value from the cache.
   * @param key - The cache key
   * @returns The cached value or undefined if not found or expired
   */
  async get(key: string): Promise<JSONObject | JSONValue | undefined> {
    const item = this.cache.get(key);

    if (!item) {
      return undefined;
    }

    // Check if item has expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    // Update last accessed time for LRU
    item.lastAccessed = Date.now();

    return item.value;
  }

  /**
   * Stores a value in the cache.
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async put(key: string, value: JSONObject | JSONValue, ttl?: number): Promise<void> {
    const now = Date.now();
    const effectiveTTL = ttl ?? this.config.defaultTTL!;

    const item: CacheItem = {
      value,
      createdAt: now,
      lastAccessed: now,
      expiresAt: effectiveTTL > 0 ? now + effectiveTTL * 1000 : undefined,
    };

    this.cache.set(key, item);

    // Evict items if we exceed maxSize
    this.evictLRU();
  }

  /**
   * Deletes a value from the cache.
   * @param key - The cache key to delete
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Checks if a key exists in the cache and has not expired.
   * @param key - The cache key to check
   * @returns True if the key exists and is not expired, false otherwise
   */
  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // Check if item has expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Increments a numeric value in the cache atomically.
   * If the key doesn't exist or is expired, it starts from 0.
   * @param key - The cache key to increment
   * @param amount - The amount to increment by (default: 1)
   * @returns The new value after incrementing
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    const item = this.cache.get(key);
    const now = Date.now();

    let currentValue = 0;

    // Check if item exists and is not expired
    if (item) {
      if (item.expiresAt && item.expiresAt < now) {
        this.cache.delete(key);
      } else {
        // Get current value, ensure it's a number
        currentValue = typeof item.value === 'number' ? item.value : 0;
      }
    }

    // Calculate new value
    const newValue = currentValue + amount;

    // Store the new value with the same TTL if it existed
    const newItem: CacheItem = {
      value: newValue,
      createdAt: item?.createdAt ?? now,
      lastAccessed: now,
      expiresAt: item?.expiresAt,
    };

    this.cache.set(key, newItem);

    return newValue;
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
