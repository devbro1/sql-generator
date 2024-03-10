---
title: Supported Databases
category: Getting Started
order: 1
---

under the hood, different libraries are used for connecting to each database:


### Postgresql
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

### Mysql
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

### Sqlite
```javascript
import { Query } from "@devbro1/sql-generator";
query = new Query({
  client: "sqlite",
  connection: "/tmp/database.db",
});

query = new Query({
  client: "sqlite",
  connection: ":memory:",
});
```

### Mssql
Not implemented yet

### Oracle
Not implemented yet
