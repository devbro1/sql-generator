import { Builder } from "./Builder";

class MySqlBuilder extends Builder {
    private connection: Connection;
    private grammar: Grammar;

    constructor(connection: Connection) {
        this.connection = connection;
        this.grammar = this.connection.getSchemaGrammar();
    }

    createDatabase(name: string): boolean {
        return this.connection.statement(
            this.grammar.compileCreateDatabase(name, this.connection)
        );
    }

    dropDatabaseIfExists(name: string): boolean {
        return this.connection.statement(
            this.grammar.compileDropDatabaseIfExists(name)
        );
    }

    getTables(): any[] {
        return this.connection.getPostProcessor().processTables(
            this.connection.selectFromWriteConnection(
                this.grammar.compileTables(this.connection.getDatabaseName())
            )
        );
    }

    getViews(): any[] {
        return this.connection.getPostProcessor().processViews(
            this.connection.selectFromWriteConnection(
                this.grammar.compileViews(this.connection.getDatabaseName())
            )
        );
    }

    getColumns(table: string): any[] {
        table = this.connection.getTablePrefix() + table;
        const results = this.connection.selectFromWriteConnection(
            this.grammar.compileColumns(this.connection.getDatabaseName(), table)
        );
        return this.connection.getPostProcessor().processColumns(results);
    }

    private connection: Connection;
    private grammar: Grammar;

    constructor(connection: Connection) {
        this.connection = connection;
        this.grammar = this.connection.getSchemaGrammar();
    }

    getIndexes(table: string): any[] {
        table = this.connection.getTablePrefix() + table;
        const results = this.connection.selectFromWriteConnection(
            this.grammar.compileIndexes(this.connection.getDatabaseName(), table)
        );
        return this.connection.getPostProcessor().processIndexes(results);
    }

    getForeignKeys(table: string): any[] {
        table = this.connection.getTablePrefix() + table;
        const results = this.connection.selectFromWriteConnection(
            this.grammar.compileForeignKeys(this.connection.getDatabaseName(), table)
        );
        return this.connection.getPostProcessor().processForeignKeys(results);
    }

    dropAllTables(): void {
        const tables = this.getTables().map(table => table.name);
        if (tables.length === 0) {
            return;
        }

        this.disableForeignKeyConstraints();

        this.connection.statement(
            this.grammar.compileDropAllTables(tables)
        );

        this.enableForeignKeyConstraints();
    }

    dropAllViews(): void {
        const views = this.getViews().map(view => view.name);
        if (views.length === 0) {
            return;
        }

        this.connection.statement(
            this.grammar.compileDropAllViews(views)
        );
    }

    disableForeignKeyConstraints(): boolean {
        return this.connection.statement(
            this.grammar.compileDisableForeignKeyConstraints()
        );
    }

    enableForeignKeyConstraints(): boolean {
        return this.connection.statement(
            this.grammar.compileEnableForeignKeyConstraints()
        );
    }

    getTables(): any[] {
        // Implementation to fetch tables should be provided here
        return [];
    }

    getViews(): any[] {
        // Implementation to fetch views should be provided here
        return [];
    }
}