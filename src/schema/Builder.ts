export class Builder {
    public static defaultStringLength = 255;
    public static defaultMorphKeyType = 'uuid';

    protected connection: any;

    protected grammar: Grammar;

    protected resolver: () => void;

    public static defaultStringLength: number | null = 255;

    public static defaultMorphKeyType: string = 'int';

    constructor(private connection: Connection) {
        this.grammar = this.connection.getSchemaGrammar();
    }

    public static defaultStringLength(length: number): void {
        DatabaseSchema.defaultStringLength = length;
    }

    public static defaultMorphKeyType(type: string): void {
        const validTypes = ['int', 'uuid', 'ulid'];
        if (!validTypes.includes(type)) {
            throw new Error("Morph key type must be 'int', 'uuid', or 'ulid'.");
        }

        DatabaseSchema.defaultMorphKeyType = type;
    }

    public static morphUsingUuids(): void {
        DatabaseSchema.defaultMorphKeyType('uuid');
    }

    public static morphUsingUlids(): void {
        DatabaseSchema.defaultMorphKeyType('ulid');
    }

    constructor(private connection: Connection) {
        this.grammar = this.connection.getSchemaGrammar();
    }

    createDatabase(name: string): void {
        throw new Error('This database driver does not support creating databases.');
    }

    dropDatabaseIfExists(name: string): boolean {
        throw new Error('This database driver does not support dropping databases.');
    }

    hasTable(table: string): boolean {
        table = this.connection.getTablePrefix() + table;

        for (const value of this.getTables(false)) {
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

    getViews(): any[] { // Specify the actual return type and adjust method logic as needed
        // Example implementation
        return [];
    }

    constructor(private connection: Connection) {
        this.grammar = this.connection.getSchemaGrammar();
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

    getColumnListing(table: string): string[] {
        // This method should be implemented based on how column listing is retrieved in your TypeScript context.
        // For example:
        return [];
    }

    table(tableName: string, callback: (table: Blueprint) => void): void {
        // Implementation of table handling logic
        // For example:
        callback(new Blueprint());
    }

    constructor(private connection: Connection) {
        this.grammar = this.connection.getSchemaGrammar();
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
            this.connection.selectFromWriteConnection(this.grammar.compileColumns(table))
        );
    }

    getIndexes(table: string): any[] {
        table = this.connection.getTablePrefix() + table;
        return this.connection.getPostProcessor().processIndexes(
            this.connection.selectFromWriteConnection(this.grammar.compileIndexes(table))
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
            this.connection.selectFromWriteConnection(this.grammar.compileForeignKeys(table))
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

    private build(blueprint: Blueprint): void {
        // Implementation of the build logic
    }

    private createBlueprint(tableName: string, callback: (blueprint: Blueprint) => void): Blueprint {
        // Create and return a new Blueprint instance
        return new Blueprint();
    }

    constructor(private connection: Connection) {
        this.grammar = this.connection.getSchemaGrammar();
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

    private build(blueprint: Blueprint): void {
        // Implementation of the build logic
    }

    private createBlueprint(tableName: string, callback: (blueprint: Blueprint) => void): Blueprint {
        // Create and return a new Blueprint instance
        return new Blueprint();
    }

    private connection: Connection;
    private grammar: Grammar;
    private resolver?: (table: string, callback?: (blueprint: Blueprint) => void, prefix?: string) => Blueprint;

    constructor(connection: Connection) {
        this.connection = connection;
        this.grammar = this.connection.getSchemaGrammar();
    }

    protected build(blueprint: Blueprint): void {
        blueprint.build(this.connection, this.grammar);
    }

    protected createBlueprint(table: string, callback?: (blueprint: Blueprint) => void): Blueprint {
        const prefix = this.connection.getConfig('prefix_indexes') ? this.connection.getConfig('prefix') : '';
        if (this.resolver) {
            return this.resolver(table, callback, prefix);
        }
        return Container.getInstance().make(Blueprint, { table, callback, prefix });
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