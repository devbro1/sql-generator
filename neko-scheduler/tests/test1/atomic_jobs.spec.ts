import type { LockHandle } from '@devbro/neko-helper';
import { describe, expect, test, vi } from 'vitest';
import { Scheduler } from '../../src';

function makeLockHandle(overrides?: Partial<LockHandle>): LockHandle {
  return {
    release: vi.fn().mockResolvedValue(undefined),
    isExpired: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe('atomic schedule jobs', () => {
  test('setAtomicLockHandler stores handler and is called on tick with correct key and ttl', async () => {
    const lock = makeLockHandle();
    const lockHandler = vi.fn().mockResolvedValue(lock);
    const jobFn = vi.fn().mockResolvedValue(undefined);

    const scheduler = new Scheduler();
    scheduler.setAtomicLockHandler(lockHandler);

    const schedule = scheduler
      .call(jobFn)
      .setName('job1')
      .atomic('custom-key', 60)
      .setCronTime('* * * * * *')
      .setRunOnStart(true);

    schedule.start();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    schedule.stop();

    expect(lockHandler).toHaveBeenCalledWith('custom-key', 60);
    expect(jobFn).toHaveBeenCalled();
    expect(lock.release).toHaveBeenCalled();
  });

  test('skips job execution when lock cannot be acquired (returns undefined)', async () => {
    const lockHandler = vi.fn().mockResolvedValue(undefined);
    const jobFn = vi.fn();

    const scheduler = new Scheduler();
    scheduler.setAtomicLockHandler(lockHandler);
    const schedule = scheduler.call(jobFn).setName('job2').atomic('job2', 30).setCronTime('* * * * * *').setRunOnStart(true);
    schedule.start();

    await new Promise((resolve) => setTimeout(resolve, 1100));
    schedule.stop();

    expect(lockHandler).toHaveBeenCalled();
    expect(jobFn).not.toHaveBeenCalled();
  });

  test('runs job and releases lock when lock is acquired', async () => {
    const lock = makeLockHandle();
    const lockHandler = vi.fn().mockResolvedValue(lock);
    const jobFn = vi.fn().mockResolvedValue(undefined);

    const scheduler = new Scheduler();
    scheduler.setAtomicLockHandler(lockHandler);
    const schedule = scheduler.call(jobFn).setName('job3').atomic('job3', 30).setCronTime('* * * * * *').setRunOnStart(true);
    schedule.start();

    await new Promise((resolve) => setTimeout(resolve, 1100));
    schedule.stop();

    expect(lockHandler).toHaveBeenCalledWith('job3', 30);
    expect(jobFn).toHaveBeenCalled();
    expect(lock.release).toHaveBeenCalled();
  });

  test('releases lock even when job throws', async () => {
    const lock = makeLockHandle();
    const lockHandler = vi.fn().mockResolvedValue(lock);
    const jobFn = vi.fn().mockRejectedValue(new Error('job error'));
    const errorHandler = vi.fn();

    const scheduler = new Scheduler();
    scheduler.setAtomicLockHandler(lockHandler);
    const schedule = scheduler
      .call(jobFn)
      .setName('job4')
      .atomic('job4', 30)
      .setErrorHandler(errorHandler)
      .setCronTime('* * * * * *')
      .setRunOnStart(true);
    schedule.start();

    await new Promise((resolve) => setTimeout(resolve, 1100));
    schedule.stop();

    expect(lock.release).toHaveBeenCalled();
    expect(errorHandler).toHaveBeenCalled();
  });

  test('uses job name as atomic key when no key provided', async () => {
    const lock = makeLockHandle();
    const lockHandler = vi.fn().mockResolvedValue(lock);
    const jobFn = vi.fn().mockResolvedValue(undefined);

    const scheduler = new Scheduler();
    scheduler.setAtomicLockHandler(lockHandler);
    const schedule = scheduler
      .call(jobFn)
      .setName('named-job')
      .atomic() // no key → should use name
      .setCronTime('* * * * * *')
      .setRunOnStart(true);
    schedule.start();

    await new Promise((resolve) => setTimeout(resolve, 1100));
    schedule.stop();

    expect(lockHandler).toHaveBeenCalledWith('named-job', 30);
  });

  test('Scheduler.setAtomicLockHandler propagates to all scheduled jobs', async () => {
    const lock = makeLockHandle();
    const lockHandler = vi.fn().mockResolvedValue(lock);

    const scheduler = new Scheduler();
    scheduler.setAtomicLockHandler(lockHandler);

    const job1 = vi.fn().mockResolvedValue(undefined);
    const job2 = vi.fn().mockResolvedValue(undefined);

    scheduler.call(job1).setName('sched-job1').atomic('sched-job1', 10).setCronTime('* * * * * *').setRunOnStart(true);
    scheduler.call(job2).setName('sched-job2').atomic('sched-job2', 10).setCronTime('* * * * * *').setRunOnStart(true);

    scheduler.start();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    scheduler.stop();

    expect(lockHandler).toHaveBeenCalledWith('sched-job1', 10);
    expect(lockHandler).toHaveBeenCalledWith('sched-job2', 10);
    expect(job1).toHaveBeenCalled();
    expect(job2).toHaveBeenCalled();
  });

  test('runs job normally when no atomic config set (no lock handler called)', async () => {
    const lockHandler = vi.fn();
    const jobFn = vi.fn().mockResolvedValue(undefined);

    const scheduler = new Scheduler();
    scheduler.setAtomicLockHandler(lockHandler);
    const schedule = scheduler
      .call(jobFn)
      .setName('non-atomic')
      // no .atomic() call
      .setCronTime('* * * * * *')
      .setRunOnStart(true);
    schedule.start();

    await new Promise((resolve) => setTimeout(resolve, 1100));
    schedule.stop();

    expect(lockHandler).not.toHaveBeenCalled();
    expect(jobFn).toHaveBeenCalled();
  });
});
