---
title: Update Statements
category: Data Manipulation
order: 2
---

# Update

```javascript
query
    .update("table1")
    .values({ col1: "val1", col2: "val2", col3: 333 })
    .where((cond: ConditionClause) => {
        cond.and("col4", "=", "val4");
        cond.andColumn("col5", "=", "col6");
    });
```