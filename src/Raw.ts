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
    let rc = this.sql;

    Object.entries(this.bindings).map(([key, value]) => {
      rc = rc.replace("$" + key, this.client.escape(value));
    });

    return rc;
  }
}
