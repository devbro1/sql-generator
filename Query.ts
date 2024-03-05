import { RawSQL } from "./Raw";

export class Query {
  nodes = {
    select: [],
    table: [],
    where: [],
    limit: [],
    offset: [],
    order_by: [],
  };

  constructor() {}

  public select(selects: string | any[] | RawSQL) {
    if (typeof selects === "string") {
      let selects2 = { alias: "", field_name: selects };
      let matches = selects.match(
        /"?(?<alias>[a-zA-Z0-9]*)"?\."?(?<var_name>.*)"?/,
      );
      if (matches) {
        selects2 = {
          alias: matches.groups?.alias,
          field_name: matches.groups?.var_name,
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

  public table(table: string) {
    this.nodes.table.push({ table_name: table });
    return this;
  }

  public from(table: string) {
    this.nodes.table.push({ table_name: table });
    return this;
  }

  public where(
    column: string | any[] | RawSQL,
    operation: string = "",
    value: any = "",
  ) {
    if (typeof column == "string") {
      this.nodes.where.push({
        column_name: column,
        operation: operation,
        value: value,
        condition: "AND",
      });
    } else if (Array.isArray(column)) {
      column.map((col) => {
        this.where(col[0], col[1], col[2]);
      });
    } else if (
      typeof column == "object" &&
      column.constructor.name === "RawSQL"
    ) {
      this.nodes.where.push({
        raw: column,
        condition: "AND",
      });
    }

    return this;
  }

  public orWhere(
    column: string | any[],
    operation: string = "",
    value: any = "",
  ) {
    if (typeof column == "string") {
      this.nodes.where.push({
        column_name: column,
        operation: operation,
        value: value,
        condition: "OR",
      });
    } else if (Array.isArray(column)) {
      column.map((col) => {
        this.where(col[0], col[1], col[2]);
      });
    }

    return this;
  }

  public whereIn(column: string, values: any[]) {
    this.nodes.where.push({
      column_name: column,
      operation: "IN",
      value: values,
      condition: "AND",
    });
    return this;
  }

  public whereBetween(column: string, values: any[]) {
    this.nodes.where.push({
      column_name: column,
      operation: "BETWEEN",
      value: values,
      condition: "AND",
    });
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

  public escape(value: any) {
    if (typeof value == "string") {
      return "'" + value.replace(/'/g, "\\'") + "'";
    } else if (typeof value == "number") {
      return value;
    } else if (Array.isArray(value)) {
      let rc = "ARRAY[";
      let count = 0;
      value.map((v) => {
        if (count) {
          rc += ", ";
        }
        rc += this.escape(v);
        count++;
      });
      rc += "]";
      return rc;
    }
  }

  public toFullSQL() {
    let rc: string[] = [];
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

    if (this.nodes.table) {
      rc.push("FROM " + this.nodes.table[0].table_name);
    }

    if (this.nodes.where.length) {
      rc.push("WHERE");
      let condition_count = 0;
      this.nodes.where.map((w) => {
        let value = this.escape(w.value);

        if (0 < condition_count) {
          rc.push(w.condition);
        }

        if (w.raw?.constructor.name === "RawSQL") {
          rc.push(w.raw.toFullSQL());
        } else if (w.operation == "IN") {
          rc.push(w.column_name + " = ANY(" + value + ")");
        } else if (w.operation == "BETWEEN") {
          rc.push(
            w.column_name +
              " BETWEEN " +
              this.escape(w.value[0]) +
              " AND " +
              this.escape(w.value[1]),
          );
        } else {
          rc.push(w.column_name + " " + w.operation + " " + value);
        }

        condition_count++;
      });
    }

    if (this.nodes.limit.length) {
      rc.push("LIMIT " + this.nodes.limit[0].limit);
    }

    if (this.nodes.offset.length) {
      rc.push("OFFSET " + this.nodes.offset[0].offset);
    }

    let rc_str = "";
    if (rc.length) {
      rc_str = rc.reduce((a, b) => {
        return a + " " + b;
      });
    }

    return rc_str;
  }

  public static raw(sql, bindings = {}) {
    return new RawSQL(sql, bindings);
  }
}
