import { scheduler } from "@devbro/pashmak/facades";
import { context_provider } from "@devbro/pashmak/context";
import { cache, db, logger } from "@devbro/pashmak/facades";

scheduler().setContextWrapper(
  (fn: () => Promise<void>): (() => Promise<void>) => {
    return async (): Promise<void> => {
      await context_provider.run(async (): Promise<void> => {
        await fn();
      });
    };
  },
);

scheduler().setAtomicLockHandler(async (name,ttl) => { return await cache().getLock(name,ttl); });

scheduler()
  .call(async () => {
    logger().info("scheduled Hello meow World");
  })
  .setCronTime("* * * * *")
  .setName("hello world cron job")
  .setRunOnStart(true);
