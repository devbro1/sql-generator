import { Connection } from "../Illuminate/Connection";
import { Blueprint } from "./Blueprint";
import { Grammar } from "./Grammars/Grammar";

export class Builder {
    
    public static defaultStringLength: number = 255;
    public static defaultMorphKeyType: string = 'int';

    protected connection: Connection;
    protected grammar: Grammar;
    protected resolver?: (table: string, callback?: (blueprint: Blueprint) => void, prefix?: string) => Blueprint;

    constructor(connection: Connection) {
        this.connection = connection;
        this.grammar = this.connection.getSchemaGrammar();
    }

    public static setDefaultStringLength(length: number): void {
        this.defaultStringLength = length;
    }

    public static setDefaultMorphKeyType(type: string): void {
        const validTypes = ['int', 'uuid', 'ulid'];
        if (!validTypes.includes(type)) {
            throw new Error("Morph key type must be 'int', 'uuid', or 'ulid'.");
        }

        this.defaultMorphKeyType = type;
    }

    public static morphUsingUuids(): void {
        this.setDefaultMorphKeyType('uuid');
    }

    public static morphUsingUlids(): void {
        this.setDefaultMorphKeyType('ulid');
    }

    createDatabase(name: string): void {
        throw new Error('This database driver does not support creating databases.');
    }

    dropDatabaseIfExists(name: string): boolean {
        throw new Error('This database driver does not support dropping databases.');
    }

    hasTable(table: string): boolean {
        table = this.connection.getTablePrefix() + table;

        for (const value of this.getTables()) {
            if (table.toLowerCase() === value['name'].toLowerCase()) {
                return true;
            }
        }

        return false;
    }

    hasView(view: string): boolean {
        view = this.connection.getTablePrefix() + view;

        for (const value of this.getViews()) {
            if (view.toLowerCase() === value['name'].toLowerCase()) {
                return true;
            }
        }

        return false;
    }

    getTables(): any[] { // Specify the actual return type based on your application's requirements
        return this.connection.getPostProcessor().processTables(
            this.connection.selectFromWriteConnection(this.grammar.compileTables())
        );
    }

    getTableListing(): string[] {
        return this.getTables().map(table => table.name);
    }

    getViews(): any[] {
        return this.connection.getPostProcessor().processViews(
            this.connection.selectFromWriteConnection(this.grammar.compileViews())
        );
    }

    getTypes(): any[] {
        throw new Error('This database driver does not support user-defined types.');
    }

    hasColumn(table: string, column: string): boolean {
        return this.getColumnListing(table).map(c => c.toLowerCase()).includes(column.toLowerCase());
    }

    hasColumns(table: string, columns: string[]): boolean {
        const tableColumns = this.getColumnListing(table).map(c => c.toLowerCase());
        return columns.every(column => tableColumns.includes(column.toLowerCase()));
    }

    whenTableHasColumn(table: string, column: string, callback: (table: Blueprint) => void): void {
        if (this.hasColumn(table, column)) {
            this.table(table, table => callback(table));
        }
    }

    whenTableDoesntHaveColumn(table: string, column: string, callback: (table: Blueprint) => void): void {
        if (!this.hasColumn(table, column)) {
            this.table(table, table => callback(table));
        }
    }

    getColumnType(table: string, column: string, fullDefinition: boolean = false): string {
        const columns = this.getColumns(table);
        for (const value of columns) {
            if (value['name'].toLowerCase() === column.toLowerCase()) {
                return fullDefinition ? value['type'] : value['type_name'];
            }
        }
        throw new Error(`There is no column with name '${column}' on table '${table}'.`);
    }

    getColumnListing(table: string): string[] {
        return this.getColumns(table).map(column => column['name']);
    }

    getColumns(table: string): any[] {
        table = this.connection.getTablePrefix() + table;
        return this.connection.getPostProcessor().processColumns(
            this.connection.selectFromWriteConnection(this.grammar.compileColumns("",table))
        );
    }

    getIndexes(table: string): any[] {
        table = this.connection.getTablePrefix() + table;
        return this.connection.getPostProcessor().processIndexes(
            this.connection.selectFromWriteConnection(this.grammar.compileIndexes("",table))
        );
    }

    getIndexListing(table: string): string[] {
        return this.getIndexes(table).map(index => index['name']);
    }

    hasIndex(table: string, index: string | string[], type: string | null = null): boolean {
        type = type ? type.toLowerCase() : null;
        for (const value of this.getIndexes(table)) {
            const typeMatches = type === null || 
                                (type === 'primary' && value['primary']) ||
                                (type === 'unique' && value['unique']) ||
                                type === value['type'];
            const indexMatches = typeof index === 'string' ? value['name'] === index : index.every(idx => value['columns'].includes(idx));

            if (indexMatches && typeMatches) {
                return true;
            }
        }
        return false;
    }

    getForeignKeys(table: string): any[] {
        table = this.connection.getTablePrefix() + table;
        return this.connection.getPostProcessor().processForeignKeys(
            this.connection.selectFromWriteConnection(this.grammar.compileForeignKeys("",table))
        );
    }

    table(tableName: string, callback: (blueprint: Blueprint) => void): void {
        this.build(this.createBlueprint(tableName, callback));
    }

    create(tableName: string, callback: (blueprint: Blueprint) => void): void {
        this.build(this.createBlueprint(tableName, blueprint => {
            blueprint.create();
            callback(blueprint);
        }));
    }

    drop(table: string): void {
        this.build(this.createBlueprint(table, blueprint => {
            blueprint.drop();
        }));
    }

    dropIfExists(table: string): void {
        this.build(this.createBlueprint(table, blueprint => {
            blueprint.dropIfExists();
        }));
    }

    dropColumns(table: string, columns: string | string[]): void {
        this.table(table, blueprint => {
            blueprint.dropColumn(columns);
        });
    }

    dropAllTables(): void {
        throw new Error('This database driver does not support dropping all tables.');
    }

    dropAllViews(): void {
        throw new Error('This database driver does not support dropping all views.');
    }

    dropAllTypes(): void {
        throw new Error('This database driver does not support dropping all types.');
    }

    rename(from: string, to: string): void {
        this.build(this.createBlueprint(from, blueprint => {
            blueprint.rename(to);
        }));
    }

    enableForeignKeyConstraints(): boolean {
        return this.connection.statement(
            this.grammar.compileEnableForeignKeyConstraints()
        );
    }

    disableForeignKeyConstraints(): boolean {
        return this.connection.statement(
            this.grammar.compileDisableForeignKeyConstraints()
        );
    }

    withoutForeignKeyConstraints(callback: () => any): any {
        this.disableForeignKeyConstraints();
        try {
            return callback();
        } finally {
            this.enableForeignKeyConstraints();
        }
    }

    protected build(blueprint: Blueprint): void {
        blueprint.build(this.connection, this.grammar);
    }

    protected createBlueprint(table: string, callback?: (blueprint: Blueprint) => void): Blueprint {
        const prefix = this.connection.getConfig('prefix_indexes') ? this.connection.getConfig('prefix') : '';

        const blueprint = new Blueprint(table, prefix);
        if(callback) {
            callback(blueprint);
        }
        if (this.resolver) {
            return this.resolver(table, callback, prefix);
        }
        return blueprint;
    }

    public getConnection(): Connection {
        return this.connection;
    }

    public setConnection(connection: Connection): this {
        this.connection = connection;
        return this;
    }

    public blueprintResolver(resolver: (table: string, callback?: (blueprint: Blueprint) => void, prefix?: string) => Blueprint): void {
        this.resolver = resolver;
    }
}