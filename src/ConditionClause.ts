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
  join_condition: "AND" | "OR" | "AND NOT" | "OR NOT";
  type: "VALUE_COMPARE" | "COLUMN_COMPARE" | "RAW";
};

type options = {
  column_name?: string;
  operation?: operation;
  value?: string | any[];
  raw?: RawSQL;
  join_condition?: "AND" | "OR" | "AND NOT" | "OR NOT";
  type?: "VALUE_COMPARE" | "COLUMN_COMPARE" | "RAW";
};

export class ConditionClause {
  nodes: node[] = [];

  client;

  constructor(client:any) {
    this.client = client;
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
      },
      ...options,
    });

    return this;
  }

  public andColumn(column: string, operation: operation, value: any) {
    return this.and(column, operation, value, { type: "COLUMN_COMPARE" });
  }

  public andRaw(raw: RawSQL) {
    return this.and("", "=", "", { raw: raw, type: "RAW" });
  }

  public or(column: string, operation: operation, value: any) {
    return this.and(column, operation, value, { join_condition: "OR" });
  }

  public orColumn(column: string, operation: operation, value: any) {
    return this.and(column, operation, value, {
      join_condition: "OR",
      type: "COLUMN_COMPARE",
    });
  }

  public orRaw(raw: RawSQL) {
    return this.and("", "=", "", {
      join_condition: "OR",
      raw: raw,
      type: "RAW",
    });
  }

  public toFullSQL() {
    const rc: string[] = [];
    let condition_count = 0;
    this.nodes.map((w: node) => {
      const value = this.client.escape(w.value);

      if (0 < condition_count) {
        rc.push(w.join_condition);
      }

      if (w.type === "RAW" && w.raw) {
        rc.push(w.raw.toFullSQL());
      } else if (w.type === "COLUMN_COMPARE") {
        rc.push(w.column_name + " " + w.operation + " " + w.value);
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
