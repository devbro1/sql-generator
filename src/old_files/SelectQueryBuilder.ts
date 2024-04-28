import { RawSQL } from "../RawSQL";
import { ConditionClause, operation } from "../Query/ConditionClause";
import { Postgresql } from "./databases/postgresql";

type node = {
  select: any[];
  table: any[];
  joins: any[];
  where: ConditionClause;
  group_by: any[];
  having: any[];
  limit: any[];
  offset: any[];
  order_by: any[];
};

export class SelectQueryBuilder {
  client;
  nodes: node = {
    select: [],
    table: [],
    joins: [],
    where: new ConditionClause({}),
    group_by: [],
    having: [],
    limit: [],
    offset: [],
    order_by: [],
  };

  constructor(client:any) {
    this.client = client;
    this.nodes.where = new ConditionClause(this.client);
  }

  public select(selects: string | any[] | RawSQL) {
    if (typeof selects === "string") {
      let selects2 = { alias: "", field_name: selects };
      const matches = selects.match(
        /"?(?<alias>[a-zA-Z0-9]*)"?\."?(?<var_name>.*)"?/,
      );
      if (matches) {
        selects2 = {
          alias: matches.groups?.alias || '',
          field_name: matches.groups?.var_name || '',
        };
      }
      this.nodes.select.push(selects2);
    } else if (Array.isArray(selects)) {
      selects.map((a) => {
        this.select(a);
      });
    } else if (selects.constructor.name === "RawSQL") {
      this.nodes.select.push(selects);
    }

    return this;
  }

  public table(table: string | RawSQL) {
    if (typeof table === "string") {
      this.nodes.table.push({ table_name: table });
    } else if (
      typeof table === "object" &&
      table.constructor.name === "RawSQL"
    ) {
      this.nodes.table.push({ raw: table });
    }

    return this;
  }

  public from(table: string | RawSQL) {
    return this.table(table);
  }

  public join(table: string, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      table: table,
      type: "TABLE_JOIN",
      join_type: "JOIN",
      on: join_on,
    });

    return this;
  }

  public innerJoin(table: string, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      table: table,
      type: "TABLE_JOIN",
      join_type: "INNER JOIN",
      on: join_on,
    });

    return this;
  }

  public outerJoin(table: string, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      table: table,
      type: "TABLE_JOIN",
      join_type: "OUTER JOIN",
      on: join_on,
    });

    return this;
  }

  public leftJoin(table: string, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      table: table,
      type: "TABLE_JOIN",
      join_type: "LEFT JOIN",
      on: join_on,
    });

    return this;
  }

  public rightJoin(table: string, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      table: table,
      type: "TABLE_JOIN",
      join_type: "RIGHT JOIN",
      on: join_on,
    });

    return this;
  }

  public fullJoin(table: string, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      table: table,
      type: "TABLE_JOIN",
      join_type: "FULL JOIN",
      on: join_on,
    });

    return this;
  }

  public joinSub(raw: RawSQL, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      raw: raw,
      type: "RAW_JOIN",
      join_type: "JOIN",
      on: join_on,
    });

    return this;
  }

  public innerJoinSub(raw: RawSQL, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      raw: raw,
      type: "RAW_JOIN",
      join_type: "INNER JOIN",
      on: join_on,
    });

    return this;
  }

  public leftJoinSub(raw: RawSQL, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      raw: raw,
      type: "RAW_JOIN",
      join_type: "LEFT JOIN",
      on: join_on,
    });

    return this;
  }

  public rightJoinSub(raw: RawSQL, join_on: (ConditionClause: ConditionClause) => void) {
    this.nodes.joins.push({
      raw: raw,
      type: "RAW_JOIN",
      join_type: "RIGHT JOIN",
      on: join_on,
    });

    return this;
  }

  public where(
    column: string | any[] | RawSQL,
    operation: operation = "=",
    value: any = "",
  ) {
    if (typeof column == "string") {
      this.nodes.where.and(column, operation, value);
    } else if (Array.isArray(column)) {
      column.map((col) => {
        this.where(col[0], col[1], col[2]);
      });
    } else if (
      typeof column == "object" &&
      column.constructor.name === "RawSQL"
    ) {
      this.nodes.where.andRaw(column);
    }

    return this;
  }

  public whereNot(
    column: string | any[] | RawSQL,
    operation: operation = "=",
    value: any = "",
  ) {
    if (typeof column == "string") {
      this.nodes.where.andNot(column, operation, value);
    } else if (Array.isArray(column)) {
      column.map((col) => {
        this.whereNot(col[0], col[1], col[2]);
      });
    } else if (
      typeof column == "object" &&
      column.constructor.name === "RawSQL"
    ) {
      this.nodes.where.andRawNot(column);
    }

    return this;
  }

  public orWhere(
    column: string | any[],
    operation: operation = "=",
    value: any = "",
  ) {
    if (typeof column == "string") {
      this.nodes.where.or(column, operation, value);
    } else if (Array.isArray(column)) {
      column.map((col) => {
        this.where(col[0], col[1], col[2]);
      });
    }

    return this;
  }

  public conditionClauseWhere(cc: ConditionClause) {
    this.nodes.where.andConditionClause(cc);
    return this;
  }

  public conditionClauseWhereNot(cc: ConditionClause) {
    this.nodes.where.andConditionClauseNot(cc);
    return this;
  }

  public orConditionClauseWhere(cc: ConditionClause) {
    this.nodes.where.orConditionClause(cc);
    return this;
  }

  public orConditionClauseWhereNot(cc: ConditionClause) {
    this.nodes.where.orConditionClause(cc);
    return this;
  }

  public whereIn(column: string, values: any[]) {
    this.nodes.where.and(column, "IN", values);
    return this;
  }

  public whereInNot(column: string, values: any[]) {
    this.nodes.where.andNot(column, "IN", values);
    return this;
  }

  public orWhereIn(column: string, values: any[]) {
    this.nodes.where.or(column, "IN", values);
    return this;
  }

  public orWhereInNot(column: string, values: any[]) {
    this.nodes.where.orNot(column, "IN", values);
    return this;
  }

  public whereBetween(column: string, values: any[]) {
    this.nodes.where.and(column, "BETWEEN", values);
    return this;
  }

  public whereBetweenNot(column: string, values: any[]) {
    this.nodes.where.andNot(column, "BETWEEN", values);
    return this;
  }

  public orWhereBetween(column: string, values: any[]) {
    this.nodes.where.or(column, "BETWEEN", values);
    return this;
  }

  public orWhereBetweenNot(column: string, values: any[]) {
    this.nodes.where.orNot(column, "BETWEEN", values);
    return this;
  }

  public whereColumn(column1: string, operation:operation,column2: string) {
    this.nodes.where.andColumn(column1,operation,column2);
    return this;
  }

  public whereColumnNot(column1: string, operation:operation,column2: string) {
    this.nodes.where.andColumnNot(column1,operation,column2);
    return this;
  }

  public orWhereColumn(column1: string, operation:operation,column2: string) {
    this.nodes.where.orColumn(column1,operation,column2);
    return this;
  }

  public orWhereColumnNot(column1: string, operation:operation,column2: string) {
    this.nodes.where.orColumnNot(column1,operation,column2);
    return this;
  }

  public whereExists(subquery: RawSQL) {
    this.nodes.where.andExists(subquery);
    return this;
  }

  public whereNull(column_name: string) {
    this.nodes.where.andNull(column_name);
    return this;
  }

  public orWhereNull(column_name: string) {
    this.nodes.where.orNull(column_name);
    return this;
  }

  public orWhereNullNot(column_name: string) {
    this.nodes.where.orNullNot(column_name);
    return this;
  }

  public WhereNullNot(column_name: string) {
    this.nodes.where.andNullNot(column_name);
    return this;
  }

  public whereDate(column:string,operation:operation,date: Date | string) {
    this.nodes.where.andDate(column,operation,new Date(date));
    return this;
  }

  public orWhereDate(column:string,operation:operation,date: Date | string) {
    this.nodes.where.orDate(column,operation,new Date(date));
    return this;
  }

  public orWhereDateNot(column:string,operation:operation,date: Date | string) {
    this.nodes.where.orDateNot(column,operation,new Date(date));
    return this;
  }

  public andWhereDate(column:string,operation:operation,date: Date | string) {
    this.nodes.where.andDateNot(column,operation,new Date(date));
    return this;
  }

  public groupBy(column: RawSQL) {
    this.nodes.group_by.push({ raw: column });

    return this;
  }

  public having(having: RawSQL) {
    this.nodes.having.push({ raw: having });

    return this;
  }

  public limit(limit: number) {
    this.nodes.limit = [{ limit: limit }];
    return this;
  }

  public offset(offset: number) {
    this.nodes.offset = [{ offset: offset }];
    return this;
  }

  public toFullSQL() {
    const rc: string[] = [];
    if (this.nodes.select.length > 0) {
      rc.push("SELECT");
      let select_fields = "";
      this.nodes.select.map((field) => {
        if (select_fields.length > 0) {
          select_fields += ", ";
        }

        if (field.constructor.name === "RawSQL") {
          select_fields += field.toFullSQL();
        } else if (typeof field == "object") {
          if (field?.alias) {
            select_fields += '"' + field?.alias + '".';
          }
          select_fields += field?.field_name;
        }
      });

      rc.push(select_fields);
    }

    if (this.nodes.table.length) {
      rc.push("FROM");
      if (this.nodes.table[0].raw?.constructor.name === "RawSQL") {
        rc.push(this.nodes.table[0].raw?.toFullSQL());
      } else {
        rc.push(this.nodes.table[0].table_name);
      }
    }

    if (this.nodes.joins.length) {
      this.nodes.joins.map((join) => {
        rc.push(join.join_type);
        if (join.type === "TABLE_JOIN") {
          rc.push(join.table);
        } else if (join.type === "RAW_JOIN") {
          rc.push(join.raw.toFullSQL());
        }
        rc.push("ON");
        const on_condition = new ConditionClause(this.client);
        join.on(on_condition);
        rc.push(on_condition.toFullSQL());
      });
    }

    if (this.nodes.where.length()) {
      rc.push("WHERE");
      rc.push(this.nodes.where.toFullSQL());
    }

    if (this.nodes.group_by.length) {
      rc.push("GROUP BY");
      rc.push(this.nodes.group_by[0].raw.toFullSQL());
    }

    if (this.nodes.having.length) {
      rc.push("HAVING");
      rc.push(this.nodes.having[0].raw.toFullSQL());
    }

    if (this.nodes.limit.length) {
      rc.push("LIMIT");
      rc.push(this.nodes.limit[0].limit);
    }

    if (this.nodes.offset.length) {
      rc.push("OFFSET");
      rc.push(this.nodes.offset[0].offset);
    }

    return rc.join(" ");
  }

  public raw(sql:string, bindings = {}) {
    const rc = new RawSQL(this.client);
    rc.set(sql, bindings);
    return rc;
  }

  public get() {
    return this.client.query(this.toFullSQL());
  }
}
