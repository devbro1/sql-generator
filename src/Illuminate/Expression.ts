export class Expression
{
    raw_sql = '';
    constructor(raw_sql: string) {
        this.raw_sql = raw_sql;
    }
    getValue(value: any=''): any {
        return this.raw_sql;
    }
}