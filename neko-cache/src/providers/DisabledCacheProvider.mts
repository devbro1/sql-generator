import type { JSONObject, JSONValue } from '@devbro/neko-helper';
import type { CacheProviderInterface } from '../CacheProviderInterface.mjs';
import { LockHandle } from '../../../neko-helper/dist/cjs';

/**
 * A cache provider that disables caching entirely.
 * All operations are no-ops, useful for testing or disabling cache in certain environments.
 */
export class DisabledCacheProvider implements CacheProviderInterface {
  /**
   * Creates a new DisabledCacheProvider instance.
   * @param config - Configuration object (currently unused)
   */
  constructor(private config = {}) {}

  /**
   * Always returns undefined (no caching).
   * @param key - The cache key
   * @returns Always undefined
   */
  async get(key: string): Promise<JSONValue | JSONObject | undefined> {
    return undefined;
  }

  /**
   * Does nothing (no caching).
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time to live in seconds
   */
  async put(_key: string, _value: JSONValue | JSONObject, _ttl?: number): Promise<void> {}

  /**
   * Does nothing (no caching).
   * @param key - The cache key to delete
   */
  async delete(_key: string): Promise<void> {}

  /**
   * Always returns false (no caching).
   * @param key - The cache key to check
   * @returns Always false
   */
  async has(_key: string): Promise<boolean> {
    return false;
  }

  /**
   * Returns the increment amount as if starting from 0 (no caching).
   * @param key - The cache key to increment
   * @param amount - The amount to increment by (default: 1)
   * @returns The increment amount
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    // Disabled cache always returns the increment amount as if starting from 0
    return amount;
  }

  async getLock(key: string, ttl: number): Promise<LockHandle|undefined> {
    // Disabled cache does not support locks, return undefined
    return undefined;
  }
}
