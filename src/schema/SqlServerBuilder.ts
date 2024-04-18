import { Connection } from "../Illuminate/Connection";
import { Builder } from "./Builder";
import { Grammar } from "./Grammars/Grammar";

class SqlServerBuilder extends Builder {
    private connection: Connection;
    private grammar: Grammar;

    constructor(connection: Connection) {
        super(connection);
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

    hasTable(table: string): boolean {
        const [schema, tableParsed] = this.parseSchemaAndTable(table);
        const schemaToUse = schema ?? this.getDefaultSchema();
        table = this.connection.getTablePrefix() + tableParsed;

        return this.getTables().some(value => 
            table.toLowerCase() === value['name'].toLowerCase() &&
            schemaToUse.toLowerCase() === value['schema'].toLowerCase()
        );
    }

    private parseSchemaAndTable(reference: string): [string?, string] {
        const parts = reference.split('.');
        const schema = parts.length === 2 ? parts[0] : undefined;
        const tableName = parts[parts.length - 1];
        return [schema, tableName];
    }

    private getTables(): any[] {
        // Implementation to fetch tables should be provided here
        return [];
    }

    hasView(view: string): boolean {
        const [schema, viewParsed] = this.parseSchemaAndTable(view);
        const schemaToUse = schema ?? this.getDefaultSchema();
        view = this.connection.getTablePrefix() + viewParsed;

        return this.getViews().some(value => 
            view.toLowerCase() === value['name'].toLowerCase() &&
            schemaToUse.toLowerCase() === value['schema'].toLowerCase()
        );
    }

    dropAllTables(): void {
        this.connection.statement(this.grammar.compileDropAllForeignKeys());
        this.connection.statement(this.grammar.compileDropAllTables());
    }

    dropAllViews(): void {
        this.connection.statement(this.grammar.compileDropAllViews());
    }

    private parseSchemaAndTable(reference: string): [string?, string] {
        const parts = reference.split('.');
        const schema = parts.length === 2 ? parts[0] : undefined;
        const tableName = parts[parts.length - 1];
        return [schema, tableName];
    }

    private getViews(): any[] {
        // Implementation to fetch views should be provided here
        return [];
    }

    getColumns(table: string): any[] {
        const [schema, tableParsed] = this.parseSchemaAndTable(table);
        table = this.connection.getTablePrefix() + tableParsed;
        const results = this.connection.selectFromWriteConnection(
            this.grammar.compileColumns(schema, table)
        );
        return this.connection.getPostProcessor().processColumns(results);
    }

    getIndexes(table: string): any[] {
        const [schema, tableParsed] = this.parseSchemaAndTable(table);
        table = this.connection.getTablePrefix() + tableParsed;
        return this.connection.getPostProcessor().processIndexes(
            this.connection.selectFromWriteConnection(this.grammar.compileIndexes(schema, table))
        );
    }

    getForeignKeys(table: string): any[] {
        const [schema, tableParsed] = this.parseSchemaAndTable(table);
        table = this.connection.getTablePrefix() + tableParsed;
        return this.connection.getPostProcessor().processForeignKeys(
            this.connection.selectFromWriteConnection(this.grammar.compileForeignKeys(schema, table))
        );
    }

    protected getDefaultSchema(): string {
        return this.connection.scalar(this.grammar.compileDefaultSchema());
    }

    protected parseSchemaAndTable(reference: string): [string?, string] {
        const parts = reference.split('.', 2);
        if (parts.length === 2 && parts[1].includes('.')) {
            const database = parts[0];
            throw new Error(`Using three-part reference is not supported, you may use 'Schema::connection("${database}")' instead.`);
        }
        return parts;
    }
}