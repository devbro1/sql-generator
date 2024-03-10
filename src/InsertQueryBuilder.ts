export class InsertQueryBuilder {
  client;
  nodes = {
    table: "",
    values: {},
    returning: [],
  };

  constructor(client:any) {
    this.client = client;
  }

  public table(table: string) {
    this.nodes.table = table;

    return this;
  }

  public values(values: object) {
    this.nodes.values = values;

    return this;
  }

  public returning(columns: string | string[]) {
    if (typeof columns === "string") {
      // @ts-expect-error type mismatch
      this.nodes.returning.push(columns);
    } else if (Array.isArray(columns)) {
      // @ts-expect-error type mismatch
      this.nodes.returning.push(...columns);
    }

    return this;
  }

  public toFullSQL(): string {
    const rc = [];

    rc.push("INSERT INTO");
    rc.push(this.nodes.table);
    rc.push("(");
    rc.push(
      Object.keys(this.nodes.values)
        .map(this.client.escapeIdentifier)
        .join(", "),
    );
    rc.push(")");
    rc.push("VALUES");
    rc.push("(");
    rc.push(
      Object.values(this.nodes.values).map(this.client.escape).join(", "),
    );
    rc.push(")");

    if (this.nodes.returning.length) {
      rc.push("RETURNING");
      rc.push(this.nodes.returning.join(", "));
    }

    return rc.join(" ");
  }
}
