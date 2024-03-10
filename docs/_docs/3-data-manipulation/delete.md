---
title: Delete Statements
category: Data Manipulation
order: 3
---

# Delete

```javascipt
query.delete("table1")
    .where((cond: ConditionClause) => {
        cond.and("col4", "=", "val4");
        cond.andColumn("col5", "=", "col6");
    });
```
