import { escapeIdentifier, escapeLiteral } from "pg/lib/utils";
import { database } from "./database";
import mysql_lib from "nodejs-mysql";
const sqlstring = require("sqlstring");

export class mysql implements database {
  connection;
  constructor(options) {
    const connection = mysql_lib.getInstance(options);
    this.connection = connection;
  }

  public escape(value: string | number | any[]): string {
    if (Array.isArray(value)) {
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
    } else if (typeof value == "string") {
      return sqlstring.escapeLiteral(value);
    } else if (typeof value == "number") {
      return value.toString();
    }
  }

  escapeIdentifier(identifier: string) {
    return sqlstring.escapeId(identifier);
  }

  public query(sql: string) {
    return this.connection.exec(sql);
  }
}
