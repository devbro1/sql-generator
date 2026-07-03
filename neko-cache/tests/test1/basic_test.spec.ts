import { sleep } from '@devbro/neko-helper';
import * as os from 'os';
import { describe, expect, test } from 'vitest';
import {
  Cache,
  type CacheProviderInterface,
  FileCacheProvider,
  MemcacheCacheProvider,
  MemoryCacheProvider,
  RedisCacheProvider,
} from '@/index';

const PROVIDERS = ['redis', 'memory', 'file', 'memcache'] as const;

describe.each(PROVIDERS)('cache provider %s', (provider_name) => {
  test('general happy path', async () => {
    let provider: CacheProviderInterface | undefined;
    if (provider_name === 'redis') {
      provider = new RedisCacheProvider({ url: `redis://${process.env.REDIS_HOST}:6379` });
    } else if (provider_name === 'memory') {
      provider = new MemoryCacheProvider();
    } else if (provider_name === 'file') {
      provider = new FileCacheProvider({ cacheDirectory: os.tmpdir() + '/cache_dir' });
    } else if (provider_name === 'memcache') {
      provider = new MemcacheCacheProvider({ location: [`${process.env.MEMCACHE_HOST}:11211`] });
    }

    const cache = new Cache(provider!);

    await cache.put('test_key_obj', { value: 123 }, 3);
    let v = await cache.get('test_key_obj');
    expect(v).toEqual({ value: 123 });

    await cache.put('test_key_obj', 123.45, 3);
    v = await cache.get('test_key_obj');
    expect(v).toEqual(123.45);

    await cache.put('test_key_obj', 'hello meow', 1);
    v = await cache.get('test_key_obj');
    expect(v).toEqual('hello meow');

    await sleep(2000);
    v = await cache.get('test_key_obj');
    expect(v).toEqual(undefined);
  });
});
