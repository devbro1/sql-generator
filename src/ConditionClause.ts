import { RawSQL } from "./Raw";

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
  value: string;
  raw: RawSQL | null;
  condition_clause: ConditionClause | null;
  join_condition: "AND" | "OR" | "AND NOT" | "OR NOT";
  type: "VALUE_COMPARE" | "COLUMN_COMPARE" | "RAW" | "CONDITION_CLAUSE";
};

type options = {
  column_name?: string;
  operation?: operation;
  value?: string | any[];
  raw?: RawSQL;
  condition_clause?: ConditionClause;
  join_condition?: "AND" | "OR" | "AND NOT" | "OR NOT";
  type?: "VALUE_COMPARE" | "COLUMN_COMPARE" | "RAW" | "CONDITION_CLAUSE";
};

export class ConditionClause {
  nodes: node[] = [];

  client;

  constructor(client:any) {
    this.client = client;


    ['Column','Raw', 'ConditionClause'].forEach((method) => {
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
    value: any,
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
      } else if (w.type === "COLUMN_COMPARE") {
        rc.push(w.column_name + " " + w.operation + " " + w.value);
      } else if (w.type === "CONDITION_CLAUSE" && w.condition_clause) {
        rc.push("(");
        rc.push(w.condition_clause.toFullSQL());
        rc.push(")");
      } else if (w.operation == "IN") {
        rc.push(w.column_name + " = ANY(" + value + ")");
      } else if (w.operation == "BETWEEN") {
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
