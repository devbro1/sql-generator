import type { CacheProviderInterface } from "@devbro/neko-cache";
import type { JSONObject, JSONValue, LockHandle } from "@devbro/neko-helper";

export class MultiCache implements CacheProviderInterface {
  constructor(private caches: CacheProviderInterface[]) {}

  async get(key: string): Promise<JSONValue | JSONObject | undefined> {
    for (const cache of this.caches) {
      const value = await cache.get(key);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }
  async put(
    key: string,
    value: JSONObject | JSONValue,
    ttl?: number,
  ): Promise<void> {
    await Promise.all(this.caches.map((cache) => cache.put(key, value, ttl)));
  }
  async delete(key: string): Promise<void> {
    await Promise.all(this.caches.map((cache) => cache.delete(key)));
  }
  async has(key: string): Promise<boolean> {
    for (const cache of this.caches) {
      if (await cache.has(key)) {
        return true;
      }
    }
    return false;
  }

  async increment(key: string, amount?: number): Promise<number> {
    let rc: number | undefined;
    for (const cache of this.caches) {
      const rc2 = await cache.increment(key, amount);
      if (rc === undefined) {
        rc = rc2;
      }
    }

    return rc!;
  }

  async getLock(key: string, ttl: number): Promise<LockHandle | undefined> {
    for (const cache of this.caches) {
      const lock = await cache.getLock(key, ttl);
      if (lock) {
        return lock;
      }
    }
    return undefined;
  }
}
