import { Client } from "pg";
import { escapeIdentifier, escapeLiteral } from "pg/lib/utils";
import { database } from "./database";

export class Postgresql implements database {
  client: Client;
  constructor(options) {
    const client = new Client(options);
    client.connect().then(() => {});
    this.client = client;
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
  }

  escapeIdentifier(identifier: string) {
    return escapeIdentifier(identifier);
  }

  public query(sql: string) {
    return this.client.query(sql);
  }
}
