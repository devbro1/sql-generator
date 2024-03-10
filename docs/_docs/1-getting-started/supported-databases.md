---
title: Supported Databases
category: Getting Started
order: 1
---

under the hood, different libraries are used for connecting to each database:

postgresql uses `pg` library:

```javascript
import { Query } from "@devbro1/sql-generator";

query = new Query({
  client: "postgresql",
  connection: {
    host: "my.database-server.com",
    port: 5332,
    database: "database-name",
    user: "database-user",
    password: "secretpassword!!",
  },
});
```

mysql uses `mysql` and `nodejs-mysql` libraries:

```javascript
import { Query } from "@devbro1/sql-generator";
query = new Query({
  client: "mysql",
  connection: {
    host: "localhost",
    user: "me",
    password: "secret",
    database: "my_db",
  },
});
```

more databases to come.
