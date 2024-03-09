export interface database {
  escape(value: string | number | any[]): string;
  escapeIdentifier(identifier: string): string;
  query(sql: string);
}
