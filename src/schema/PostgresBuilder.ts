import { Connection } from "../Illuminate/Connection";
import { Builder } from "./Builder";
import { Grammar } from "./Grammars/Grammar";

export class PostgresBuilder extends Builder {
    protected connection: Connection;
    protected grammar: Grammar;

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
        const [schema, tableParsed] = this.parseSearchPath(table);
        table = this.connection.getTablePrefix() + tableParsed;

        for (const value of this.getTables()) {
            if (table.toLowerCase() === value['name'].toLowerCase()
                && schema.toLowerCase() === value['schema'].toLowerCase()) {
                return true;
            }
        }

        return false;
    }

    hasView(view: string): boolean {
        const [schema, viewParsed] = this.parseSearchPath(view);
        view = this.connection.getTablePrefix() + viewParsed;

        for (const value of this.getViews()) {
            if (view.toLowerCase() === value['name'].toLowerCase()
                && schema.toLowerCase() === value['schema'].toLowerCase()) {
                return true;
            }
        }

        return false;
    }

    getTypes(): any[] {
        return this.connection.getPostProcessor().processTypes(
            this.connection.selectFromWriteConnection(this.grammar.compileTypes())
        );
    }

    getTables(): any[] {
        // This method should be implemented to return tables
        return [];
    }

    getViews(): any[] {
        // This method should be implemented to return views
        return [];
    }

    dropAllTables(): void {
        let tables: string[] = [];
        const excludedTables = this.grammar.escapeNames(
            this.connection.getConfig('dont_drop') || ['spatial_ref_sys']
        );
        const schemas = this.grammar.escapeNames(this.getSchemas());

        for (const table of this.getTables()) {
            const qualifiedName = `${table['schema']}.${table['name']}`;
            if (!excludedTables.includes(this.grammar.escapeNames([table['name'], qualifiedName])[0])
                && schemas.includes(this.grammar.escapeNames([table['schema']])[0])) {
                tables.push(qualifiedName);
            }
        }

        if (tables.length > 0) {
            this.connection.statement(
                this.grammar.compileDropAllTables(tables)
            );
        }
    }

    dropAllViews(): void {
        let views: string[] = [];
        const schemas = this.grammar.escapeNames(this.getSchemas());

        for (const view of this.getViews()) {
            if (schemas.includes(this.grammar.escapeNames([view['schema']])[0])) {
                views.push(`${view['schema']}.${view['name']}`);
            }
        }

        if (views.length > 0) {
            this.connection.statement(
                this.grammar.compileDropAllViews(views)
            );
        }
    }

    dropAllTypes(): void {
        let types: string[] = [];
        let domains: string[] = [];
        const schemas = this.grammar.escapeNames(this.getSchemas());

        for (const type of this.getTypes()) {
            if (!type['implicit'] && schemas.includes(this.grammar.escapeNames([type['schema']])[0])) {
                if (type['type'] === 'domain') {
                    domains.push(`${type['schema']}.${type['name']}`);
                } else {
                    types.push(`${type['schema']}.${type['name']}`);
                }
            }
        }

        if (types.length > 0) {
            this.connection.statement(this.grammar.compileDropAllTypes(types));
        }
        if (domains.length > 0) {
            this.connection.statement(this.grammar.compileDropAllDomains(domains));
        }
    }

    getColumns(table: string): any[] {
        const [schema, tableParsed] = this.parseSearchPath(table);
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

    protected getSchemas(): string[] {
        return this.parseSearchPath(
            this.connection.getConfig('search_path') || this.connection.getConfig('schema') || 'public'
        );
    }

    protected parseSchemaAndTable(reference: string): [string, string] {
        const parts = reference.split('.');
        if (parts.length > 2) {
            const database = parts[0];
            throw new Error(`Using three-part reference is not supported, you may use 'Schema::connection("${database}")' instead.`);
        }

        let schema = this.getSchemas()[0];
        if (parts.length === 2) {
            schema = parts[0];
            parts.shift();
        }

        return [schema, parts[0]];
    }

    parseSearchPath(input: string): [string, string] {
        return this.baseParseSearchPath(input);
    }
    protected parseSearchPath(searchPath: string | string[] | null): string[] {
        return this.baseParseSearchPath(searchPath).map(schema => {
            return schema === '$user' ? this.connection.getConfig('username') : schema;
        });
    }

    baseParseSearchPath(input: string | string[] | null): string[] {
        if (typeof input === 'string') {
            return input.split(',');
        } else if (Array.isArray(input)) {
            return input;
        } else {
            return [];
        }
    }
}