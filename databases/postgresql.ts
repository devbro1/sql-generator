import {escapeIdentifier, escapeLiteral} from 'pg/lib/utils';
export class Postgresql {
    constructor(options) {
        
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
      }
      else if (typeof value == "string") {
        return escapeLiteral(value);
      } else if (typeof value == "number") {
        return value.toString();
      }
    }

    escapeIdentifier(identifier: string) {
      return escapeIdentifier(identifier);
    }
  }
  