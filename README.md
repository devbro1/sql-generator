# sql-generator

> [!CAUTION]
> Still in Alpha. Not good for production yet!!! I expect various things to change

Inspired by laravel, this is my attempt to create a create an ORM for javascript and nodejs that has all the features.

for documentation please check [documentations](https://devbro1.github.io/sql-generator/)


## Quick Example

```javascript
import { Query } from "@devbro1/sql-generator";

let query = new Query({
  client: "postgresql",
  connection: {
    host: "my.database-server.com",
    port: 5432,
    database: "database-name",
    user: "database-user",
    password: "secretpassword!!",
  },
});

const qb = query
      .select(["product_id", query.raw("SUM(quantity) AS total_quantity")])
      .from("sales")
      .where("col1", "=", "value")
      .orWhere("col2", "=", "value2")
      .groupBy(query.raw("product_id"));

console.log(qb.toFullSQL());
const result = await qb.get();

console.log(result);
```


## report bugs or suggestions

for bugs or suggestions please submit issues in github:
[github issues](https://github.com/devbro1/sql-generator/issues)

Please consider adding sample codes that I can test.

## wanna help?

wanna help? just submit a PR with new features, test cases, documentation improvements, or etc.
If you want to help with money or coffee, please consider donating to your local animal shelter or men's shelters.


### random useful commands

```
clear; jest --findRelatedTests tests/select/join.spec.ts
```