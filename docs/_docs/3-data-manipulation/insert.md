---
title: Insert Statements
category: Data Manipulation
order: 1
---

# Insert

full example of insert:
```javascript
query.insert("table1")
    .values({ col1: "val1", col2: "val2", col3: 333 })
    .returning("id");
```

values need to be an object of all possible values. key needs to match table column.
for now there is no support for multiple inserts yet.


### returning
this method only works for postgresql. This is not supported in mysql. use a raw query and [last_insert_id()](https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id).