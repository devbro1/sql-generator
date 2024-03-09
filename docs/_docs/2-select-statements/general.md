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
query.select(["name","email","age"]).from("table");
query.select(query.raw("count(*) as count")).from("table");
query.select(["name", query.raw("max(*) as maximum"),query.raw("min(*) as minimum")]).from("table");
```

## From

```javascript
query.select("*").from("table");
query.select("*").from("table t1");
query.select("*").from(query.raw("(select * from table1) t1"));
```

## Where

```javascript
query.select("*").from("table").where("col1", "=", "value");

query.select("*").from("table")
    .where([
    ["status", "=", "1"],
    ["subscribed", "<>", "1"],
    ]);

query.select("*").from("table")
    .where("col1", "=", "value")
    .where("col2", "=", "value2");
```

## orWhere

```javascript
query.select("*").from("table")
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