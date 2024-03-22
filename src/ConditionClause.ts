import { RawSQL } from "./Raw";
const { DateTime } = require('luxon');


export type operation =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "IN"
  | "BETWEEN"
  | "ILIKE"
  | "LIKE";
type node = {
  column_name: string;
  operation: operation;
  value: number | string | string[] | number[] | Date;
  raw: RawSQL | null;
  condition_clause: ConditionClause | null;
  join_condition: "AND" | "OR" | "AND NOT" | "OR NOT";
  type: "VALUE_COMPARE" | "COLUMN_COMPARE" | "RAW" | "CONDITION_CLAUSE" | "EXISTS" | "NULL" | "DATE_COMPARE";
};

type options = {
  column_name?: string;
  operation?: operation;
  value?: number | string | string[] | number[] | Date;
  raw?: RawSQL;
  condition_clause?: ConditionClause;
  join_condition?: "AND" | "OR" | "AND NOT" | "OR NOT";
  type?: "VALUE_COMPARE" | "COLUMN_COMPARE" | "RAW" | "CONDITION_CLAUSE" | "EXISTS" | "NULL" | "DATE_COMPARE";
};

export class ConditionClause {
  nodes: node[] = [];

  client;

  constructor(client:any) {
    this.client = client;


    ['Column','Raw', 'ConditionClause', 'Exists', 'Null', 'Date'].forEach((method) => {
        // @ts-ignore
        this['or' + method] = (...args:any) => { this['and'+method](...args,{join_condition: 'OR'})};
        // @ts-ignore
        this['and' + method + 'Not'] = (...args:any) => { this['and'+method](...args,{join_condition: 'AND NOT'})};
        // @ts-ignore
        this['or' + method + 'Not'] = (...args:any) => { this['and'+method](...args,{join_condition: 'OR NOT'})};
    });
  }

  public length() {
    return this.nodes.length;
  }

  public and(
    column: string,
    operation: operation,
    value: number | string | string[] | number[] | Date,
    options: options = {},
  ) {
    this.nodes.push({
      ...{
        column_name: column,
        operation: operation,
        value: value,
        join_condition: "AND",
        type: "VALUE_COMPARE",
        raw: null,
        condition_clause: null,
      },
      ...options,
    });

    return this;
  }

  public andNot(column: string, operation: operation, value: any) {
    return this.and(column, operation, value, { join_condition: "AND NOT" });
  }

  public or(column: string, operation: operation, value: any) {
    return this.and(column, operation, value, { join_condition: "OR" });
  }

  public orNot(column: string, operation: operation, value: any) {
    return this.and(column, operation, value, { join_condition: "OR NOT" });
  }

  public orColumn = (column: string, operation: operation, value: any, options: options = {}) => this;
  public orColumnNot = (column: string, operation: operation, value: any, options: options = {}) => this;
  public andColumnNot = (column: string, operation: operation, value: any, options: options = {}) => this;
  public andColumn(column: string, operation: operation, value: any, options: options = {}) {
    return this.and(column, operation, value, {...{ type: "COLUMN_COMPARE" },...options});
  }

  public orRaw = (raw: RawSQL, options: options = {}) => this;
  public orRawNot = (raw: RawSQL, options: options = {}) => this;
  public andRawNot = (raw: RawSQL, options: options = {}) => this;
  public andRaw(raw: RawSQL, options: options = {}) {
    return this.and("", "=", "", {...{ raw: raw, type: "RAW" }, ...options});
  }

  public orConditionClause = (cc: ConditionClause, options:options = {})=> this;
  public orConditionClauseNot = (cc: ConditionClause, options:options = {}) => this;
  public andConditionClauseNot = (cc: ConditionClause, options:options = {}) => this;
  public andConditionClause(cc: ConditionClause, options:options = {}) {
    return this.and("", "=", "", {...{ condition_clause: cc, type: "CONDITION_CLAUSE" }, ...options});
  }


  public orExists = (subquery: RawSQL, options: options = {}) => this;
  public orExistsNot = (subquery: RawSQL, options: options = {}) => this;
  public andExistsNot = (subquery: RawSQL, options: options = {}) => this;
  public andExists(subquery: RawSQL, options: options = {}) {
    return this.and("", "=", "", {...{ raw: subquery, type: "EXISTS" }, ...options});
  }

  public orNull = (column: string, options: options = {}) => this;
  public orNullNot = (column: string, options: options = {}) => this;
  public andNullNot = (column: string, options: options = {}) => this;
  public andNull(column: string, options: options = {}) {
    return this.and("", "=", "", {...{ column_name: column, type: "NULL" }, ...options});
  }


  public orDate = (column: string,operation: operation,date: Date, options: options = {}) => this;
  public orDateNot = (column: string,operation: operation,date: Date, options: options = {}) => this;
  public andDateNot = (column: string,operation: operation,date: Date, options: options = {}) => this;
  public andDate(column: string,operation: operation,date: Date, options: options = {}) {
    return this.and(column, operation, date, {...{ column_name: column, type: "DATE_COMPARE" }, ...options});
  }

  public toFullSQL() {
    const rc: string[] = [];
    let condition_count = 0;
    this.nodes.map((w: node) => {
      const value = this.client.escape(w.value);

      if (0 < condition_count) {
        rc.push(w.join_condition);
      }
      else if(w.join_condition.indexOf("NOT") !== -1)
      {
        rc.push("NOT");
      }

      if (w.type === "RAW" && w.raw) {
        rc.push(w.raw.toFullSQL());
      } else if (w.type === "EXISTS" && w.raw) {
        rc.push("EXISTS ( " + w.raw.toFullSQL() + " )");
      } else if (w.type === "COLUMN_COMPARE") {
        rc.push(w.column_name + " " + w.operation + " " + w.value);
      } else if (w.type === "NULL") {
        rc.push(w.column_name);
        rc.push("IS NULL");
      } else if (w.type === "CONDITION_CLAUSE" && w.condition_clause) {
        rc.push("(");
        rc.push(w.condition_clause.toFullSQL());
        rc.push(")");
      } else if (w.type === "DATE_COMPARE") {
        const date = DateTime.fromJSDate(w.value);
        console.log(date);
        const formattedDate = date.toFormat('yyyy-MM-dd');
        rc.push(w.column_name + " " + w.operation + " " + this.client.escape(formattedDate));
      } else if (w.operation == "IN") {
        rc.push(w.column_name + " = ANY(" + value + ")");
      } else if (w.operation == "BETWEEN" && Array.isArray(w.value)) {
        rc.push(
          w.column_name +
            " BETWEEN " +
            this.client.escape(w.value[0]) +
            " AND " +
            this.client.escape(w.value[1]),
        );
      } else {
        rc.push(w.column_name + " " + w.operation + " " + value);
      }

      condition_count++;
    });

    return rc.join(" ");
  }
}
