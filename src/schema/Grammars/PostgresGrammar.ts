import { Grammar } from './Grammar';
import { Connection } from '../../Illuminate/Connection';
import { Blueprint } from '../Blueprint';
import { Expression } from '../../Illuminate/Expression';
import { ColumnDefinition } from '../ColumnDefinition';

export class PostgresGrammar extends Grammar {
    protected transactions: boolean = true;
    protected modifiers: string[] = ['Collate', 'Nullable', 'Default', 'VirtualAs', 'StoredAs', 'GeneratedAs', 'Increment'];
    protected serials: string[] = ['bigInteger', 'integer', 'mediumInteger', 'smallInteger', 'tinyInteger'];
    protected fluentCommands: string[] = ['AutoIncrementStartingValues', 'Comment'];
    protected connection: Connection;

    public constructor(connection: Connection) {
        super();
        this.connection = connection;
    }

    public compileCreateDatabase(name: string, connection: Connection): string {
        return `create database ${this.wrapValue(name)} encoding ${this.wrapValue(connection.getConfig('charset'))}`;
    }

    public compileDropDatabaseIfExists(name: string): string {
        return `drop database if exists ${this.wrapValue(name)}`;
    }

    public compileTables(): string {
        return `select c.relname as name, n.nspname as schema, pg_total_relation_size(c.oid) as size, ` +
            `obj_description(c.oid, 'pg_class') as comment from pg_class c, pg_namespace n ` +
            `where c.relkind in ('r', 'p') and n.oid = c.relnamespace and n.nspname not in ('pg_catalog', 'information_schema') ` +
            `order by c.relname`;
    }

    public compileViews(): string {
        return `select viewname as name, schemaname as schema, definition from pg_views ` +
            `where schemaname not in ('pg_catalog', 'information_schema') order by viewname`;
    }

    public compileTypes(): string {
        return `select t.typname as name, n.nspname as schema, t.typtype as type, t.typcategory as category, ` +
            `((t.typinput = 'array_in'::regproc and t.typoutput = 'array_out'::regproc) or t.typtype = 'm') as implicit ` +
            `from pg_type t join pg_namespace n on n.oid = t.typnamespace ` +
            `left join pg_class c on c.oid = t.typrelid ` +
            `left join pg_type el on el.oid = t.typelem ` +
            `left join pg_class ce on ce.oid = el.typrelid ` +
            `where ((t.typrelid = 0 and (ce.relkind = 'c' or ce.relkind is null)) or c.relkind = 'c') ` +
            `and not exists (select 1 from pg_depend d where d.objid in (t.oid, t.typelem) and d.deptype = 'e') ` +
            `and n.nspname not in ('pg_catalog', 'information_schema')`;
    }

    public compileColumns(schema: string, table: string): string {
        return `select a.attname as name, t.typname as type_name, format_type(a.atttypid, a.atttypmod) as type, ` +
            `(select tc.collcollate from pg_catalog.pg_collation tc where tc.oid = a.attcollation) as collation, ` +
            `not a.attnotnull as nullable, ` +
            `(select pg_get_expr(adbin, adrelid) from pg_attrdef where c.oid = pg_attrdef.adrelid and pg_attrdef.adnum = a.attnum) as default, ` +
            `${this.connection.getServerVersion()?.startsWith('12.0') ? "'' as generated, " : 'a.attgenerated as generated, '}` +
            `col_description(c.oid, a.attnum) as comment ` +
            `from pg_attribute a, pg_class c, pg_type t, pg_namespace n ` +
            `where c.relname = ${this.quoteString(table)} and n.nspname = ${this.quoteString(schema)} ` +
            `and a.attnum > 0 and a.attrelid = c.oid and a.atttypid = t.oid and n.oid = c.relnamespace ` +
            `order by a.attnum`;
    }

    public compileIndexes(schema: string, table: string): string {
        return `select ic.relname as name, string_agg(a.attname, ',' order by indseq.ord) as columns, ` +
            `am.amname as "type", i.indisunique as "unique", i.indisprimary as "primary" ` +
            `from pg_index i ` +
            `join pg_class tc on tc.oid = i.indrelid ` +
            `join pg_namespace tn on tn.oid = tc.relnamespace ` +
            `join pg_class ic on ic.oid = i.indexrelid ` +
            `join pg_am am on am.oid = ic.relam ` +
            `join lateral unnest(i.indkey) with ordinality as indseq(num, ord) on true ` +
            `left join pg_attribute a on a.attrelid = i.indrelid and a.attnum = indseq.num ` +
            `where tc.relname = ${this.quoteString(table)} and tn.nspname = ${this.quoteString(schema)} ` +
            `group by ic.relname, am.amname, i.indisunique, i.indisprimary`;
    }

    public compileForeignKeys(schema: string, table: string): string {
        return `select c.conname as name, ` +
            `string_agg(la.attname, ',' order by conseq.ord) as columns, ` +
            `fn.nspname as foreign_schema, fc.relname as foreign_table, ` +
            `string_agg(fa.attname, ',' order by conseq.ord) as foreign_columns, ` +
            `c.confupdtype as on_update, c.confdeltype as on_delete ` +
            `from pg_constraint c ` +
            `join pg_class tc on c.conrelid = tc.oid ` +
            `join pg_namespace tn on tn.oid = tc.relnamespace ` +
            `join pg_class fc on c.confrelid = fc.oid ` +
            `join pg_namespace fn on fn.oid = fc.relnamespace ` +
            `join lateral unnest(c.conkey) with ordinality as conseq(num, ord) on true ` +
            `join pg_attribute la on la.attrelid = c.conrelid and la.attnum = conseq.num ` +
            `join pg_attribute fa on fa.attrelid = c.confrelid and fa.attnum = c.confkey[conseq.ord] ` +
            `where c.contype = 'f' and tc.relname = ${this.quoteString(table)} and tn.nspname = ${this.quoteString(schema)} ` +
            `group by c.conname, fn.nspname, fc.relname, c.confupdtype, c.confdeltype`;
    }

    public compileCreate(blueprint: Blueprint, command: any): string {
        return `${blueprint.properties.temporary ? 'create temporary' : 'create'} table ${this.wrapTable(blueprint)} ` +
            `(${this.getColumns(blueprint).join(', ')})`;
    }

    public compileAdd(blueprint: Blueprint, command: any): string {
        return `alter table ${this.wrapTable(blueprint)} ` +
            `${this.prefixArray('add column', this.getColumns(blueprint)).join(', ')}`;
    }

    public compileAutoIncrementStartingValues(blueprint: Blueprint, command: any): string | undefined {
        if (command.column.autoIncrement && command.column.startingValue) {
            const table = blueprint.getTable().split('.').pop();
            return `alter sequence ${blueprint.getPrefix()}${table}_${command.column.name}_seq ` +
                `restart with ${command.column.startingValue}`;
        }
    }

    public compileChange(blueprint: Blueprint, command: any, connection: Connection): string {
        const columns: string[] = [];

        for (const column of blueprint.getChangedColumns()) {
            const changes: string[] = [`type ${this.getType(column)}${this.modifyCollate(blueprint, column)}`];

            for (const modifier of this.modifiers) {
                if (modifier === 'Collate') {
                    continue;
                }

                const method = `modify${modifier}` as keyof typeof this;
                if (typeof this[method] === 'function') {
                    const constraints = (this[method] as Function)(blueprint, column);
                    changes.push(...constraints);
                }
            }

            columns.push(this.prefixArray(`alter column ${this.wrap(column)}`, changes).join(', '));
        }

        return `alter table ${this.wrapTable(blueprint)} ${columns.join(', ')}`;
    }

    public compilePrimary(blueprint: Blueprint, command: any): string {
        const columns = this.columnize(command.columns);
        return `alter table ${this.wrapTable(blueprint)} add primary key (${columns})`;
    }

    public compileUnique(blueprint: Blueprint, command: any): string {
        let sql = `alter table ${this.wrapTable(blueprint)} add constraint ${this.wrap(command.index)} unique ` +
            `(${this.columnize(command.columns)})`;

        if (command.deferrable !== null) {
            sql += command.deferrable ? ' deferrable' : ' not deferrable';
        }

        if (command.deferrable && command.initiallyImmediate !== null) {
            sql += command.initiallyImmediate ? ' initially immediate' : ' initially deferred';
        }

        return sql;
    }

    public compileIndex(blueprint: Blueprint, command: any): string {
        return `create index ${this.wrap(command.index)} on ${this.wrapTable(blueprint)}` +
            `${command.algorithm ? ' using ' + command.algorithm : ''} (${this.columnize(command.columns)})`;
    }

    public compileFulltext(blueprint: Blueprint, command: any): string {
        const language = command.language || 'english';
        const columns = command.columns.map((column: ColumnDefinition) => `to_tsvector(${this.quoteString(language)}, ${this.wrap(column)})`);
        return `create index ${this.wrap(command.index)} on ${this.wrapTable(blueprint)} using gin ((${columns.join(' || ')}))`;
    }

    public compileSpatialIndex(blueprint: Blueprint, command: any): string {
        command.algorithm = 'gist';
        return this.compileIndex(blueprint, command);
    }

    public compileForeign(blueprint: Blueprint, command: any): string {
        let sql = super.compileForeign(blueprint, command);

        if (command.deferrable !== null) {
            sql += command.deferrable ? ' deferrable' : ' not deferrable';
        }

        if (command.deferrable && command.initiallyImmediate !== null) {
            sql += command.initiallyImmediate ? ' initially immediate' : ' initially deferred';
        }

        if (command.notValid !== null) {
            sql += ' not valid';
        }

        return sql;
    }

    public compileDrop(blueprint: Blueprint, command: any): string {
        return 'drop table ' + this.wrapTable(blueprint);
    }

    public compileDropIfExists(blueprint: Blueprint, command: any): string {
        return 'drop table if exists ' + this.wrapTable(blueprint);
    }

    public compileDropAllTables(tables: string[]): string {
        return 'drop table ' + this.escapeNames(tables).join(',') + ' cascade';
    }

    public compileDropAllViews(views: string[]): string {
        return 'drop view ' + this.escapeNames(views).join(',') + ' cascade';
    }

    public compileDropAllTypes(types: string[]): string {
        return 'drop type ' + this.escapeNames(types).join(',') + ' cascade';
    }


    public compileDropAllDomains(domains: string[]): string {
        return 'drop domain ' + this.escapeNames(domains).join(',') + ' cascade';
    }

    public compileDropColumn(blueprint: Blueprint, command: any): string {
        const columns = this.prefixArray('drop column', this.wrapArray(command.columns));
        return 'alter table ' + this.wrapTable(blueprint) + ' ' + columns.join(', ');
    }

    public compileDropPrimary(blueprint: Blueprint, command: any): string {
        const table = blueprint.getTable().split('.').pop();
        const index = this.wrap(`${blueprint.getPrefix()}${table}_pkey`);
        return 'alter table ' + this.wrapTable(blueprint) + ' drop constraint ' + index;
    }

    public compileDropUnique(blueprint: Blueprint, command: any): string {
        const index = this.wrap(command.index);
        return 'alter table ' + this.wrapTable(blueprint) + ' drop constraint ' + index;
    }

    public compileDropIndex(blueprint: Blueprint, command: any): string {
        return 'drop index ' + this.wrap(command.index);
    }

    public compileDropFullText(blueprint: Blueprint, command: any): string {
        return this.compileDropIndex(blueprint, command);
    }

    public compileDropSpatialIndex(blueprint: Blueprint, command: any): string {
        return this.compileDropIndex(blueprint, command);
    }

    public compileDropForeign(blueprint: Blueprint, command: any): string {
        const index = this.wrap(command.index);
        return 'alter table ' + this.wrapTable(blueprint) + ' drop constraint ' + index;
    }

    public compileRename(blueprint: Blueprint, command: any): string {
        const from = this.wrapTable(blueprint);
        return 'alter table ' + from + ' rename to ' + this.wrapTable(command.to);
    }

    public compileRenameIndex(blueprint: Blueprint, command: any): string {
        return `alter index ${this.wrap(command.from)} rename to ${this.wrap(command.to)}`;
    }

    public compileEnableForeignKeyConstraints(): string {
        return 'SET CONSTRAINTS ALL IMMEDIATE;';
    }

    public compileDisableForeignKeyConstraints(): string {
        return 'SET CONSTRAINTS ALL DEFERRED;';
    }

    public compileComment(blueprint: Blueprint, command: any): string {
        if (command.column.comment !== null || command.column.change) {
            const comment = command.column.comment !== null ? `'${command.column.comment}'` : 'NULL';
            return `comment on column ${this.wrapTable(blueprint)}.${this.wrap(command.column.name)} is ${comment}`;
        }

        return '';
    }

    public compileTableComment(blueprint: Blueprint, command: any): string {
        return `comment on table ${this.wrapTable(blueprint)} is '${command.comment}'`;
    }


    protected escapeNames(names: string[]): string[] {
        return names.map(name => `"${name.split('.').map(segment => segment.replace(/['"]/g, '')).join('"."')}"`);
    }

    protected typeChar(column: ColumnDefinition): string {
        return column.properties.length ? `char(${column.properties.length})` : 'char';
    }

    protected typeString(column: ColumnDefinition): string {
        return column.properties.length ? `varchar(${column.properties.length})` : 'varchar';
    }

    protected typeTinyText(column: ColumnDefinition): string {
        return 'varchar(255)';
    }

    protected typeText(column: ColumnDefinition): string {
        return 'text';
    }

    protected typeMediumText(column: ColumnDefinition): string {
        return 'text';
    }

    protected typeLongText(column: ColumnDefinition): string {
        return 'text';
    }

    protected typeInteger(column: ColumnDefinition): string {
        return column.properties.autoIncrement && column.generatedAs === null && !column.change ? 'serial' : 'integer';
    }

    protected typeBigInteger(column: ColumnDefinition): string {
        return column.properties.autoIncrement && column.generatedAs === null && !column.change ? 'bigserial' : 'bigint';
    }

    protected typeMediumInteger(column: ColumnDefinition): string {
        return this.typeInteger(column);
    }

    protected typeTinyInteger(column: ColumnDefinition): string {
        return this.typeSmallInteger(column);
    }

    protected typeSmallInteger(column: ColumnDefinition): string {
        return column.properties.autoIncrement && column.generatedAs === null && !column.change ? 'smallserial' : 'smallint';
    }

    protected typeFloat(column: ColumnDefinition): string {
        return column.properties.precision ? `float(${column.properties.precision})` : 'float';
    }

    protected typeDouble(column: ColumnDefinition): string {
        return 'double precision';
    }

    protected typeReal(column: ColumnDefinition): string {
        return 'real';
    }

    protected typeDecimal(column: ColumnDefinition): string {
        return `decimal(${column.properties.total}, ${column.properties.places})`;
    }

    protected typeBoolean(column: ColumnDefinition): string {
        return 'boolean';
    }

    protected typeEnum(column: ColumnDefinition): string {
        return `varchar(255) check ("${column.name}" in (${this.quoteString(column.properties.allowed)}))`;
    }

    protected typeJson(column: ColumnDefinition): string {
        return 'json';
    }

    protected typeJsonb(column: ColumnDefinition): string {
        return 'jsonb';
    }

    protected typeDate(column: ColumnDefinition): string {
        return 'date';
    }

    protected typeDateTime(column: ColumnDefinition): string {
        return this.typeTimestamp(column);
    }

    protected typeDateTimeTz(column: ColumnDefinition): string {
        return this.typeTimestampTz(column);
    }

    protected typeTime(column: ColumnDefinition): string {
        return `time${column.properties.precision ? `(${column.properties.precision})` : ''} without time zone`;
    }

    protected typeTimeTz(column: ColumnDefinition): string {
        return `time${column.properties.precision ? `(${column.properties.precision})` : ''} with time zone`;
    }

    protected typeTimestamp(column: ColumnDefinition): string {
        if (column.properties.useCurrent) {
            // Assuming Expression class for default value generation
            column.default(new Expression('CURRENT_TIMESTAMP'));
        }
        return `timestamp${column.properties.precision ? `(${column.properties.precision})` : ''} without time zone`;
    }

    protected typeTimestampTz(column: ColumnDefinition): string {
        if (column.properties.useCurrent) {
            // Assuming Expression class for default value generation
            column.default(new Expression('CURRENT_TIMESTAMP'));
        }
        return `timestamp${column.properties.precision ? `(${column.properties.precision})` : ''} with time zone`;
    }

    protected typeYear(column: ColumnDefinition): string {
        return this.typeInteger(column);
    }

    protected typeBinary(column: ColumnDefinition): string {
        return 'bytea';
    }

    protected typeUuid(column: ColumnDefinition): string {
        return 'uuid';
    }

    protected typeIpAddress(column: ColumnDefinition): string {
        return 'inet';
    }

    protected typeMacAddress(column: ColumnDefinition): string {
        return 'macaddr';
    }

    protected typeGeometry(column: ColumnDefinition): string {
        if (column.properties.subtype) {
            return `geometry(${column.properties.subtype.toLowerCase()}${column.properties.srid ? ',' + column.properties.srid : ''})`;
        }
        return 'geometry';
    }

    protected typeGeography(column: ColumnDefinition): string {
        if (column.properties.subtype) {
            return `geography(${column.properties.subtype.toLowerCase()}${column.properties.srid ? ',' + column.properties.srid : ''})`;
        }
        return 'geography';
    }

    protected modifyCollate(blueprint: Blueprint, column: ColumnDefinition): string | null {
        if (column.properties.collation !== '') {
            return ' collate ' + this.wrapValue(column.properties.collation);
        }
        return null;
    }

    protected modifyNullable(blueprint: Blueprint, column: ColumnDefinition): string | null {
        if (column.needs_change) {
            return column.properties.nullable ? 'drop not null' : 'set not null';
        }
        return column.properties.nullable ? ' null' : ' not null';
    }

    protected modifyDefault(blueprint: Blueprint, column: ColumnDefinition): string | null {
        if (column.needs_change) {
            if (!column.properties.autoIncrement || column.properties.generatedAs !== false) {
                return column.properties.default === null ? 'drop default' : 'set default ' + this.getDefaultValue(column.properties.default);
            }
            return null;
        }
        if (column.default !== null) {
            return ' default ' + this.getDefaultValue(column.default);
        }
        return null;
    }

    protected modifyIncrement(blueprint: Blueprint, column: ColumnDefinition): string | null {
        if (!column.change &&
            !this.hasCommand(blueprint, 'primary') &&
            (this.serials.includes(column.properties.type) || column.properties.generatedAs !== false) &&
            column.properties.autoIncrement) {
            return ' primary key';
        }
        return null;
    }

    protected modifyVirtualAs(blueprint: Blueprint, column: ColumnDefinition): string {
        if (column.needs_change) {
            if ('virtualAs' in column.getAttributes() && column.properties.virtualAs === '') {
                return 'drop expression if exists';
            }
            throw new Error('This database driver does not support modifying generated columns.');;
        }
        if (column.virtualAs !== null) {
            return " generated always as (" + this.getValue(column.virtualAs) + ")";
        }
        return '';
    }

    protected modifyStoredAs(blueprint: Blueprint, column: ColumnDefinition): string {
        if (column.needs_change) {
            if ('storedAs' in column.getAttributes() && column.properties.storedAs) {
                return 'drop expression if exists';
            }
            else
            {
                throw new Error('This database driver does not support modifying generated columns.');
            }
        }
        if (column.properties.storedAs !== null) {
            return " generated always as (" + this.getValue(column.properties.storedAs) + ") stored";
        }
        return '';
    }

    protected modifyGeneratedAs(blueprint: Blueprint, column: ColumnDefinition): string | string[] | null {
        let sql: string | null = null;

        if (column.generatedAs !== null) {
            sql = ` generated ${column.properties.always ? 'always' : 'by default'}` +
                (!['boolean', 'integer', 'bigint', 'smallint'].includes(column.properties.type) &&
                column.properties.generatedAs !== true ? ` (${column.properties.generatedAs})` : '');
        }

        if (column.needs_change) {
            const changes: string[] = column.properties.autoIncrement && sql === null ? [] : ['drop identity if exists'];

            if (sql !== null) {
                changes.push('add ' + sql);
            }

            return changes;
        }

        return sql;
    }
}