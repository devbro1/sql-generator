import * as os from 'os';
import { describe, expect, test } from 'vitest';
import {
  DisabledCacheProvider,
  FileCacheProvider,
  MemcacheCacheProvider,
  MemoryCacheProvider,
  RedisCacheProvider,
  type CacheProviderInterface,
} from '@/index';

const PROVIDERS = ['redis', 'memory', 'file', 'memcache'] as const;
const DEFAULT_LOCK_DURATION = 2; // seconds

describe.each(PROVIDERS)('getLock - provider %s', (provider_name) => {
  function makeProvider(): CacheProviderInterface {
    if (provider_name === 'redis') {
      return new RedisCacheProvider({ url: `redis://${process.env.REDIS_HOST}:6379` });
    } else if (provider_name === 'memory') {
      return new MemoryCacheProvider();
    } else if (provider_name === 'file') {
      return new FileCacheProvider({ cacheDirectory: os.tmpdir() + '/cache_dir_lock' });
    } else {
      return new MemcacheCacheProvider({ location: [`${process.env.MEMCACHE_HOST}:11211`] });
    }
  }

  test('returns a LockHandle on first acquisition', async () => {
    const provider = makeProvider();
    const lock = await provider.getLock('lock_test_1_' + provider_name, DEFAULT_LOCK_DURATION);
    expect(lock).toBeDefined();
    expect(typeof lock!.release).toBe('function');
    expect(typeof lock!.isExpired).toBe('function');
    await lock!.release();
  });

  test('returns undefined when lock is already held', async () => {
    const provider = makeProvider();
    const key = 'lock_test_2_' + provider_name;
    const lock1 = await provider.getLock(key, DEFAULT_LOCK_DURATION);
    expect(lock1).toBeDefined();

    const lock2 = await provider.getLock(key, DEFAULT_LOCK_DURATION);
    expect(lock2).toBeUndefined();

    await lock1!.release();
  });

  test('isExpired returns false while lock is held', async () => {
    const provider = makeProvider();
    const lock = await provider.getLock('lock_test_3_' + provider_name, DEFAULT_LOCK_DURATION);
    expect(lock).toBeDefined();

    const expired = await lock!.isExpired();
    expect(expired).toBe(false);

    await lock!.release();
  });

  test('isExpired returns true after release', async () => {
    const provider = makeProvider();
    const lock = await provider.getLock('lock_test_4_' + provider_name, DEFAULT_LOCK_DURATION);
    expect(lock).toBeDefined();

    await lock!.release();
    const expired = await lock!.isExpired();
    expect(expired).toBe(true);
  });

  test('lock can be re-acquired after release', async () => {
    const provider = makeProvider();
    const key = 'lock_test_5_' + provider_name;

    const lock1 = await provider.getLock(key, DEFAULT_LOCK_DURATION);
    expect(lock1).toBeDefined();
    await lock1!.release();

    const lock2 = await provider.getLock(key, DEFAULT_LOCK_DURATION);
    expect(lock2).toBeDefined();
    await lock2!.release();
  });
});

describe('getLock - DisabledCacheProvider', () => {
  test('always returns undefined', async () => {
    const provider = new DisabledCacheProvider();
    const lock = await provider.getLock('any_key', DEFAULT_LOCK_DURATION);
    expect(lock).toBeUndefined();
  });
});
