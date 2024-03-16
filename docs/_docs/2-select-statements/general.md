---
title: select statements
category: Select Statements
order: 1
---

## Select

different ways of using select field:

```javascript
query.select("*").from("table");
query.select("column1 as name").select("column2 as email").from("table");
query.select(["name", "email", "age"]).from("table");
query.select(query.raw("count(*) as count")).from("table");
query
  .select([
    "name",
    query.raw("max(*) as maximum"),
    query.raw("min(*) as minimum"),
  ])
  .from("table");
```

## From

```javascript
query.select("*").from("table");
query.select("*").from("table t1");
query.select("*").from(query.raw("(select * from table1) t1"));
```

## Join Clause

join clauses can have super simple or very complicated `ON` section. to remedy this. there is a special `ConditionClause` class that allows for creating both simple and complex conditions.

`ConditionClause` provides following methods:

```javascript
.and(column,operation,value)
.or(column,operation,value)
.andColumn(column1,operation,column2)
.orColumn(column1,operation,column2)
.andRaw(rawSQL)
.orRaw(rawSQL)

```

### join

```javascript
query
    .select("*")
    .from("table1")
    .join("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
    });
```

### innerJoin

```javascript
query
    .select("*")
    .from("table1")
    .innerJoin("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
    });
```

### leftJoin

```javascript
query
    .select("*")
    .from("table1")
    .leftJoin("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
    });
```

### rightJoin

```javascript
query
    .select("*")
    .from("table1")
    .rightJoin("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
    });
```

### fullJoin

```javascript
query
    .select("*")
    .from("table1")
    .fullJoin("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
    });
```

### joinSub

Other valid joinSub methods are `innerJoinSub`, `leftJoinSub`, `rightJoinSub`

```javascript
query
    .select("*")
    .from("table1")
    .joinSub(
    query.raw("(select * from table2) t2"),
    (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "t2.col2");
    });
```

###

## Where Clause

### where

```
.where(column,operation,value)
.where(RawSQL)
```

```javascript
query.select("*").from("table").where("col1", "=", "value");

query
  .select("*")
  .from("table")
  .where([
    ["status", "=", "1"],
    ["subscribed", "<>", "1"],
  ]);

query
  .select("*")
  .from("table")
  .where("col1", "=", "value")
  .where("col2", "=", "value2");

query.select("*").from("table").where(query.raw("col2 < col1 + 100"));


```

possible values for operation are: =, <, >, !=, <=, >=, ILIKE, LIKE

## orWhere

```javascript
query
  .select("*")
  .from("table")
  .where("col1", "=", "value")
  .orWhere("col2", "=", "value2");
```

Note if you place `orWhere()` first it will act as if it is `where()`.

```javascript
query.select("*").from("table")
    .where("col1", "=", "value")
    .orWhere("col2", "=", "value2");
// SELECT * FROM table WHERE col1 = 'value' OR col2 = 'value2';

query.select("*").from("table")
    .orwhere("col1", "=", "value")
    .orWhere("col2", "=", "value2");
// SELECT * FROM table WHERE col1 = 'value' OR col2 = 'value2';

query.select("*").from("table")
    .orWhere("col2", "=", "value2");
    .where("col1", "=", "value")
// SELECT * FROM table WHERE col1 = 'value' AND col2 = 'value2';
```

# WhereBetween

```javascript
query.select("*").from("table").whereBetween("col1", [111, 222]);
```

# whereIn

```javascript
query.select("*").from("table").whereIn("col1", [1, 2, 3, 4]);
```

# nested condtions

it is possible to created complex nested where clauses. make sure to get your ConditionClause object from your query object specially if you are using different types of database.

```javascript
const cc1 = query.conditionClause();
const cc2 = query.conditionClause();

cc1.and("sound","=","meow");
cc1.and("sound","=","rawr");

cc2.and("price",">",1000);
cc2.and("price","<",10);

const qb = query
    .select("*")
    .from("table")
    .where("col1", "=", "value")
    .conditionClauseWhere(cc1)
    .orConditionClauseWhere(cc2);
```
## grouping

to group rows, `groupBy` and `having` can be used:

```javascript
query
  .select(["product_id", query.raw("SUM(quantity) AS total_quantity")])
  .from("sales")
  .groupBy(query.raw("product_id"))
  .having(query.raw("SUM(quantity) > 100"));
```

## limiting output

`limit` and `offset`:

```javascript
query.select("*").from("table").limit(20).offset(5000);
```

## Using RawSQL

you can use `query.raw()` as an alternative sql code in various places. You can pass one different type of values as second argument for creating dynamic queries.

```javascript
query.raw("col1 > col2").toFullSql();
// col1 > col2
query.raw("col1 > ::col2: and col3 != :val1:", {col2: "column2", val1: "val's first value"}).toFullSQL();
// col1 > column2 and col3 != 'val\' first value'
```

using ::place_holder: will treat value as identifier.

using :place holder: will treat value as literal.