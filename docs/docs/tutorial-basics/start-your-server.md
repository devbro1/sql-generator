---
sidebar_position: 6
---

# Start Your Server

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Start All Services

To start the HTTP server, scheduler, and queues all together:

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>
    ```bash
    npm run pdev start
    ```
  </TabItem>
  <TabItem value="yarn" label="Yarn">
    ```bash
    yarn pdev start
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm pdev start
    ```
  </TabItem>
</Tabs>

## Start Individual Services

`pdev start` accepts flags to start individual services:

- `--all`: Start all services
- `--http`: Start only the HTTP server
- `--scheduler` / `--cron`: Start only the scheduler
- `--queue`: Start only the queue workers

## Filtering Which Cron Jobs Run

Use `--cron-names` to start only specific named cron jobs instead of all of them:

```bash
# Start only the "session_cleanup" and "daily_digest" jobs
yarn pdev start --cron --cron-names session_cleanup --cron-names daily_digest
```

This is useful in horizontally-scaled deployments where different workers should handle different cron jobs. Jobs must have a name set via `.setName()` to be targetable.

## Filtering Which Queue Channels Run

Use `--queue-channels` to start listeners for specific queue channels only. The flag supports three formats:

| Format                    | Meaning                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `channel_name`            | Start `channel_name` on the `default` queue connection             |
| `queue_name:channel_name` | Start `channel_name` on the named `queue_name` connection          |
| `queue_name:*`            | Start all channels on the named `queue_name` connection (wildcard) |

```bash
# Listen only to the "payments" channel on the default connection
yarn pdev start --queue --queue-channels payments

# Listen to "refunds" on the "payments" connection
yarn pdev start --queue --queue-channels payments:refunds

# Listen to multiple channels across different connections
yarn pdev start --queue \
  --queue-channels default:emails \
  --queue-channels payments:refunds
```

When `--queue-channels` is omitted, **all** configured queue connections and channels are started (existing behaviour).
