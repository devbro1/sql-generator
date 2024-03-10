// @ts-expect-error type does not exists
import { escapeIdentifier, escapeLiteral } from "pg/lib/utils";
import { database } from "./database";
// @ts-expect-error type does not exists
import sqlite3 from 'better-sqlite3';


export class Sqlite implements database {
  db: sqlite3.Database;
  constructor(options: any) {
    this.db = sqlite3(options);
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
      return escapeLiteral(value);
    } else if (typeof value == "number") {
      return value.toString();
    }

    return "";
  }

  escapeIdentifier(identifier: string) {
    return escapeIdentifier(identifier);
  }

  public query(sql: string) {
    return new Promise((resolve, reject) => {
      let result: any[] = [];
      result = this.db.prepare(sql).all();
      resolve(result);
      return result;
    });
  }
}
