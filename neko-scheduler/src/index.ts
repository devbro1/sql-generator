import { CronJob, validateCronExpression } from 'cron';
import type { LockHandle } from '@devbro/neko-helper';

export class Schedule {
  private cronJob: CronJob | undefined;
  private name: string = '';
  private timezone = '';
  private cronTime = '* * * * * *';
  private runOnStart = false;
  private atomicKey = '';
  private atomicTtl = 30;
  private atomicLockHandler:
    ((key: string, ttl: number) => Promise<LockHandle | undefined>) | undefined;

  constructor(private func: () => void) {}

  async trigger(): Promise<void> {
    await this.func();
  }

  errorHandler(err: any, self: Schedule) {
    console.log(`error in '${self.getName()}' cronjob`);
    console.error(err);
  }

  setErrorHandler(func: typeof this.errorHandler): this {
    this.errorHandler = func;
    return this;
  }

  start(): void {
    if (this.cronJob && this.cronJob.isActive) {
      return;
    }

    this.cronJob = CronJob.from({
      cronTime: this.cronTime,
      onTick: async () => {
        try {
          if (this.atomicKey && this.atomicLockHandler) {
            const lock = await this.atomicLockHandler(this.atomicKey, this.atomicTtl);
            if (!lock) {
              return;
            }
            try {
              await this.func();
            } finally {
              await lock.release();
            }
          } else {
            await this.func();
          }
        } catch (err) {
          this.errorHandler(err, this);
        }
      },
      onComplete: null,
      start: true,
      timeZone: this.timezone,
      runOnInit: this.runOnStart,
    });
  }

  stop(): void {
    this.cronJob?.stop();
    this.cronJob = undefined;
  }

  setName(name: string): this {
    this.name = name;
    return this;
  }

  getName(): string {
    return this.name;
  }

  setTimezone(timezone: string): this {
    this.timezone = timezone;
    return this;
  }

  getTimezone(): string {
    return this.timezone;
  }

  setCronTime(cronTime: string): this {
    const validation = validateCronExpression(cronTime);
    if (!validation.valid) {
      throw validation.error;
    }
    this.cronTime = cronTime;
    return this;
  }
  getCronTime(): string {
    return this.cronTime;
  }

  setRunOnStart(runOnStart: boolean): this {
    this.runOnStart = runOnStart;
    return this;
  }

  getRunOnStart(): boolean {
    return this.runOnStart;
  }

  atomic(key: string = '', ttl: number = 30): this {
    this.atomicKey = key || this.name;
    this.atomicTtl = ttl;

    return this;
  }

  setAtomicLockHandler(
    handler: ((key: string, ttl: number) => Promise<LockHandle | undefined>) | undefined
  ): this {
    this.atomicLockHandler = handler;
    return this;
  }
}

export class Scheduler {
  private jobs: Schedule[] = [];
  private errorHandler: ((err: any, job: Schedule) => void) | undefined;
  private contextWrapper: ((func: () => void) => () => void) | undefined;
  private atomicLockHandler:
    ((key: string, ttl: number) => Promise<LockHandle | undefined>) | undefined;

  call(func: () => void): Schedule {
    if (this.contextWrapper) {
      func = this.contextWrapper(func);
    }

    const schedule = new Schedule(func);
    schedule.setAtomicLockHandler(this.atomicLockHandler);
    this.jobs.push(schedule);
    return schedule;
  }

  setErrorHandler(func: typeof this.errorHandler) {
    this.errorHandler = func;
  }

  start(jobNames: string[] = []): void {
    for (const job of this.jobs) {
      if (this.errorHandler !== undefined) {
        job.setErrorHandler(this.errorHandler);
      }
      if (jobNames.length === 0 || jobNames.includes(job.getName())) {
        job.start();
      }
    }
  }

  stop() {
    for (const job of this.jobs) {
      job.stop();
    }
  }

  getSchedules(): Schedule[] {
    return this.jobs;
  }

  findSchedule(name: string): Schedule | undefined {
    return this.jobs.find((job) => job.getName() === name);
  }

  getScheduleNames(): string[] {
    return this.jobs.map((job) => job.getName()).filter((name) => name !== '') as string[];
  }

  setContextWrapper(func: typeof this.contextWrapper) {
    this.contextWrapper = func;
  }

  setAtomicLockHandler(func: (key: string, ttl: number) => Promise<LockHandle | undefined>) {
    this.atomicLockHandler = func;
  }
}
