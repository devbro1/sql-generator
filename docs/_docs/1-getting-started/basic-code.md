---
title: Basic code
category: Getting Started
order: 3
---

simple code for doing a select statement
```javascript
import { Query } from "@devbro1/sql-generator";

query = new Query({ client: "postgresql", connection: { ??? } });
let result = await query.select("*").from("table").get();
console.log(result);
```

if you ever want to see the sql statement that is generated:
```javascript
import { Query } from "@devbro1/sql-generator";

query = new Query({ client: "postgresql", connection: { ??? } });
let qb = query.select("*").from("table");
console.log(qb.toFullSQL());
```
