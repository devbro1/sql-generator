export class DefaultDB {
  public static escape(value: any): string {
    if (typeof value == "string") {
      return "'" + value.replace(/'/g, "\\'") + "'";
    } else if (typeof value == "number") {
      return value.toString();
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
}
