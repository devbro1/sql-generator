import type { JSONValue, LockHandle } from '@devbro/neko-helper';
import { createHash } from 'crypto';
import type { CacheProviderInterface } from './CacheProviderInterface.mjs';
import { L } from 'vitest/dist/chunks/environment.d.cL3nLXbE.js';

/**
 * Options for cache operations.
 */
export type cacheOptions = {
  /** Time to live in seconds */
  ttl?: number;
};

/**
 * Cache class providing a unified interface for various cache providers.
 * Handles key generation, serialization, and common cache operations.
 */
export class Cache {
  /**
   * Creates a new Cache instance.
   * @param provider - The cache provider implementation to use
   */
  constructor(private provider: CacheProviderInterface) {}

  /**
   * Retrieves a value from the cache.
   * @template T - The expected type of the cached value
   * @param key - The cache key (can be string, number, object, or array)
   * @returns The cached value or undefined if not found or expired
   */
  async get<T>(key: JSONValue): Promise<T | undefined> {
    return this.provider.get(this.generateKey(key)) as Promise<T | undefined>;
  }

  /**
   * Stores a value in the cache.
   * @param key - The cache key (can be string, number, object, or array)
   * @param value - The value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async put(key: JSONValue, value: any, ttl?: number): Promise<void> {
    return this.provider.put(this.generateKey(key), value, ttl);
  }

  /**
   * Deletes a value from the cache.
   * @param key - The cache key to delete
   */
  async delete(key: JSONValue): Promise<void> {
    return this.provider.delete(this.generateKey(key));
  }

  /**
   * Checks if a key exists in the cache.
   * @param key - The cache key to check
   * @returns True if the key exists and has not expired, false otherwise
   */
  async has(key: JSONValue): Promise<boolean> {
    return this.provider.has(this.generateKey(key));
  }

  /**
   * Increments a numeric value in the cache atomically.
   * @param key - The cache key to increment
   * @param amount - The amount to increment by (default: 1)
   * @returns The new value after incrementing
   */
  async increment(key: JSONValue, amount: number = 1): Promise<number> {
    return this.provider.increment(this.generateKey(key), amount);
  }

  /**
   * Gets a value from cache or executes callback and caches the result.
   * This is useful for caching expensive operations.
   * @template T - The expected type of the value
   * @param key - The cache key
   * @param callback - Function to execute if cache miss occurs
   * @param options - Cache options including TTL (default: 3600 seconds)
   * @returns The cached value or the result of the callback
   */
  async remember<T>(
    key: JSONValue,
    callback: () => Promise<T>,
    options: cacheOptions = {}
  ): Promise<T> {
    options.ttl = options.ttl ?? 3600; // default TTL 1 hour

    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    const result = await callback();
    await this.put(key, result, options.ttl);
    return result;
  }

  /**
   * Generates a cache key by serializing and hashing complex keys.
   * Simple string keys under 250 characters are returned as-is.
   * Complex keys (objects, arrays, long strings) are MD5 hashed.
   * @param key - The key to generate a cache key from
   * @returns A string suitable for use as a cache key
   */
  generateKey(key: JSONValue): string {
    if (typeof key === 'string' && key.length <= 250) {
      return key;
    }
    return createHash('md5').update(JSON.stringify(key)).digest('hex');
  }

  getLock(key: string, ttl: number): Promise<LockHandle|undefined> {
    return this.provider.getLock(key, ttl);
  }
}
