


class Table {
    columns : Column[] = [];
    constructor(table_name: string) {

    }

    exists(table_already_exists:boolean) {

    }

    string(column_name:string) {
        const rc = new Column(column_name,"string");
        this.columns.push(rc);

        return rc;
    }

    id() {
        const rc = new Column("id","bigIncrement");
        this.columns.push(rc);

        return rc;
    }

    integer(column_name:string) {
        const rc = new Column(column_name,"integer");
        this.columns.push(rc);

        return rc;
    }

    generateCreateTable() {

    }

    generateAlterTable() {

    }

    generateDropTable() {
        
    }
}