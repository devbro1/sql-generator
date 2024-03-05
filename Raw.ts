export class RawSQL {
  sql = "";
  bindings = {};
  constructor(sql: string, bindings: object = {}) {
    this.sql = sql;
    this.bindings = bindings;
  }

  toFullSQL() {
    let rc = this.sql;

    Object.entries(this.bindings).map(([key, value]) => {
      rc = rc.replace("$" + key, value.toString());
    });

    return rc;
  }
}
