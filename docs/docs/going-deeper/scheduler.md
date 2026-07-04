---
sidebar_position: 9
---

# Scheduler and Cron Jobs

Every system needs to run some tasks periodically. Pashmak provides a simple way to define and run scheduled tasks using cron syntax.

## Basic Usage

```ts
import { scheduler } from "@devbro/pashmak/facades";

scheduler()
  .call(async () => {
    console.log("This runs every minute");
  })
  .setCronTime("* * * * *")
  .setName("cleanup cron job")
  .setRunOnStart(true);
```

## Cron Syntax

The cron syntax follows the standard format:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, where 0 and 7 are Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Examples

```ts
// Every minute
scheduler().call(handler).setCronTime("* * * * *");

// Every hour at minute 0
scheduler().call(handler).setCronTime("0 * * * *");

// Every day at midnight
scheduler().call(handler).setCronTime("0 0 * * *");

// Every Monday at 9 AM
scheduler().call(handler).setCronTime("0 9 * * 1");

// Every 15 minutes
scheduler().call(handler).setCronTime("*/15 * * * *");

// First day of every month at midnight
scheduler().call(handler).setCronTime("0 0 1 * *");
```

## Scheduler Methods

### start() and stop()

Control the scheduler's execution:

```ts
import { scheduler } from "@devbro/pashmak/facades";

// Start all scheduled tasks
scheduler().start();

// Start only specific named jobs
scheduler().start(["session_cleanup", "daily_digest"]);

// Stop all scheduled tasks
scheduler().stop();
```

`start()` accepts an optional `jobNames` array. When provided, only jobs whose name matches an entry in the array are started. Jobs without a name set via `.setName()` are never started when a filter is used. Passing an empty array (or omitting the argument) starts all registered jobs.

### getSchedules()

Get all currently registered schedules:

```ts
const schedules = scheduler().getSchedules();
console.log(`Found ${schedules.length} scheduled tasks`);
```

### findSchedule(name)

Find a specific schedule by its name:

```ts
const schedule = scheduler().findSchedule("cleanup cron job");
if (schedule) {
  console.log("Schedule found");
}
```

**Note:** Schedules must have a name set via `.setName()` to be findable.

### getScheduleNames()

Get all schedule names:

```ts
const names = scheduler().getScheduleNames();
console.log("Scheduled tasks:", names);
```

### setErrorHandler(handler)

Set a global error handler for all scheduled tasks:

```ts
import { logger } from "@devbro/pashmak/facades";

scheduler().setErrorHandler(async (error, scheduleName) => {
  logger().error({
    msg: "Scheduled task failed",
    scheduleName,
    error: error.message,
  });

  // Send notification, log to external service, etc.
});
```

### atomic() and setAtomicLockHandler()
In production you will be running the same code in several places. To make sure only one copy of job is running at any given time, you can use `.atomic()`

```ts
scheduler().setAtomicLockHandler(async (name,ttl) => { return await cache().getLock(name,ttl); });

scheduler().call(handler).setCronTime("* * * * *").setName('job1').atomic();
scheduler().call(handler).setCronTime("* * * * *").atomic('lock_for_jobs');
scheduler().call(handler).setCronTime("* * * * *").atomic('lock_for_jobs',5);
```

atomic locking requires that you either set a name for the job or use a lock name. It is possible that multiple jobs
use the same lock name. It will result only one job to run among jobs sharing the same lock name.

Atomic locks must expire eventually, otherwise crons may get stuck. Default value is set to 30 seconds. If you need to modify this value you must pass a second parameter for this.

If a second job wants to run but atomic lock is not obtained, current execution of the job will be cancelled. The job will execute again the next time it is scheduled. 

### setContextWrapper(func)

Set a custom context wrapper function. This is an advanced feature for switching the context provider:

```ts
scheduler().setContextWrapper((fn) => {
  // Your custom context wrapper implementation
  return fn();
});
```

**Warning:** Only use this if you understand the context management system.

## Complete Example

```ts
// src/schedulers.ts
import { scheduler } from "@devbro/pashmak/facades";
import { logger } from "@devbro/pashmak/facades";
import { User } from "./app/models/User";

// Clean up old sessions every day at 2 AM
scheduler()
  .call(async () => {
    logger().info("Starting session cleanup");
    const deleted = await Session.deleteOlderThan(30); // days
    logger().info({ msg: "Session cleanup complete", deleted });
  })
  .setCronTime("0 2 * * *")
  .setName("session_cleanup")
  .setRunOnStart(false);

// Send daily digest emails every day at 8 AM
scheduler()
  .call(async () => {
    logger().info("Sending daily digest emails");
    const users = await User.getActiveUsers();
    for (const user of users) {
      await sendDigestEmail(user);
    }
    logger().info({ msg: "Digest emails sent", count: users.length });
  })
  .setCronTime("0 8 * * *")
  .setName("daily_digest")
  .setRunOnStart(false);

// Health check every 5 minutes
scheduler()
  .call(async () => {
    const healthy = await performHealthCheck();
    if (!healthy) {
      logger().error("Health check failed!");
    }
  })
  .setCronTime("*/5 * * * *")
  .setName("health_check")
  .setRunOnStart(true); // Run immediately on startup

// Set error handler
scheduler().setErrorHandler(async (error, scheduleName) => {
  logger().error({
    msg: "Scheduled task error",
    task: scheduleName,
    error: error.message,
    stack: error.stack,
  });
});
```

## Running the Scheduler

The scheduler starts automatically when using the `--all` flag, or can be started explicitly:

```bash
# Start all services including the scheduler
npm run pdev start --all

# Start only the scheduler (--cron is an alias for --scheduler)
yarn pdev start --scheduler
pnpm pdev start --cron

# Start only specific named cron jobs
pnpm pdev start --cron --cron-names session_cleanup --cron-names daily_digest
```

See [Start Your Server](../tutorial-basics/start-your-server.md) for more details on the `--cron-names` filter.
