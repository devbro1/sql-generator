import { replaceBindings } from "./utils/stringUtils";

export class RawSQL {
  sql = "";
  bindings = {};
  client;

  constructor(client:any) {
    this.client = client;
  }
  set(sql: string, bindings: object = {}) {
    this.sql = sql;
    this.bindings = bindings;
  }

  toFullSQL() {
    return replaceBindings(this.sql,this.bindings,this.client.escape);
  }
}
