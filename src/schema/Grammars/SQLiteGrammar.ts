import { Grammar } from "./Grammar";
import { Blueprint } from "../Blueprint";

export class SQLiteGrammar extends Grammar
{
    protected modifiers = ['Increment', 'Nullable', 'Default', 'Collate', 'VirtualAs', 'StoredAs'];

    protected serials = ['bigInteger', 'integer', 'mediumInteger', 'smallInteger', 'tinyInteger'];

    public compileSqlCreateStatement(name: string, type: string = 'table'): string
    {
        return `select "sql" from sqlite_master where type = ${ this.wrap(type) } and name = ${ this.wrap(name.replace('.', '__')) }`;
    }

    public compileDbstatExists(): string
    {
        return "select exists (select 1 from pragma_compile_options where compile_options = 'ENABLE_DBSTAT_VTAB') as enabled";
    }

    public compileTables(withSize: boolean = false): string
    {
        return withSize
            ? 'select m.tbl_name as name, sum(s.pgsize) as size from sqlite_master as m ' +
            'join dbstat as s on s.name = m.name ' +
            "where m.type in ('table', 'index') and m.tbl_name not like 'sqlite_%' " +
            'group by m.tbl_name ' +
            'order by m.tbl_name'
            : "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name";
    }

    public compileViews(): string
    {
        return "select name, sql as definition from sqlite_master where type = 'view' order by name";
    }

    public compileColumns(table: string): string
    {
        return `select name, type, not "notnull" as "nullable", dflt_value as "default", pk as "primary", hidden as "extra" ` +
            `from pragma_table_xinfo(${ this.wrap(table.replace('.', '__')) }) order by cid asc`;
    }

    public compileIndexes(table: string): string
    {
        return `select "primary" as name, group_concat(col) as columns, 1 as "unique", 1 as "primary" ` +
            `from (select name as col from pragma_table_info(${ table }) where pk > 0 order by pk, cid) group by name ` +
            `union select name, group_concat(col) as columns, "unique", origin = "pk" as "primary" ` +
            `from (select il.*, ii.name as col from pragma_index_list(${ table }) il, pragma_index_info(il.name) ii order by il.seq, ii.seqno) ` +
            `group by name, "unique", "primary"`;
    }

    public compileForeignKeys(table: string): string
    {
        return `select group_concat("from") as columns, "table" as foreign_table, ` +
            `group_concat("to") as foreign_columns, on_update, on_delete ` +
            `from (select * from pragma_foreign_key_list(${ this.wrap(table.replace('.', '__')) }) order by id desc, seq) ` +
            `group by id, "table", on_update, on_delete`;
    }

    public compileCreate(blueprint: Blueprint, command: Fluent): string
    {
        return `${ blueprint.temporary ? 'create temporary' : 'create' } table ${ this.wrapTable(blueprint) } (${ this.getColumns(blueprint).join(', ') }${ this.addForeignKeys(this.getCommandsByName(blueprint, 'foreign')) }${ this.addPrimaryKeys(this.getCommandByName(blueprint, 'primary')) })`;
    }

    protected addForeignKeys(foreignKeys: ForeignKeyDefinition[]): string
    {
        return foreignKeys.reduce((sql, foreign) =>
        {
            return sql + this.getForeignKey(foreign);
        }, '');
    }

    protected getForeignKey(foreign: Fluent): string
    {
        let sql = `, foreign key(${ this.columnize(foreign.columns) }) references ${ this.wrapTable(foreign.on) }(${ this.columnize(foreign.references) })`;

        if (foreign.onDelete !== null)
        {
            sql += ` on delete ${ foreign.onDelete }`;
        }

        if (foreign.onUpdate !== null)
        {
            sql += ` on update ${ foreign.onUpdate }`;
        }

        return sql;
    }

    protected addPrimaryKeys(primary: Fluent | null): string
    {
        if (primary !== null)
        {
            return `, primary key (${ this.columnize(primary.columns) })`;
        }

        return '';
    }

    public compileAdd(blueprint: Blueprint, command: Fluent): string[]
    {
        const columns = this.prefixArray('add column', this.getColumns(blueprint));

        return columns.map(column =>
        {
            return `alter table ${ this.wrapTable(blueprint) } ${ column }`;
        });
    }

    public compileChange(blueprint: Blueprint, command: Fluent, connection: Connection): string[]
    {
        throw new RuntimeException('SQLite does not support altering columns.');
    }

    public compileUnique(blueprint: Blueprint, command: Fluent): string
    {
        return `create unique index ${ this.wrap(command.index) } on ${ this.wrapTable(blueprint) } (${ this.columnize(command.columns) })`;
    }

    public compileIndex(blueprint: Blueprint, command: Fluent): string
    {
        return `create index ${ this.wrap(command.index) } on ${ this.wrapTable(blueprint) } (${ this.columnize(command.columns) })`;
    }

    public compileSpatialIndex(blueprint: Blueprint, command: Fluent): void
    {
        throw new RuntimeException('The database driver in use does not support spatial indexes.');
    }

    public compileForeign(blueprint: Blueprint, command: Fluent): string | null
    {
        // Handled on table creation...
        return null;
    }

    public compileDrop(blueprint: Blueprint, command: Fluent): string
    {
        return `drop table ${ this.wrapTable(blueprint) }`;
    }

    public compileDropIfExists(blueprint: Blueprint, command: Fluent): string
    {
        return `drop table if exists ${ this.wrapTable(blueprint) }`;
    }

    public compileDropAllTables(): string
    {
        return "delete from sqlite_master where type in ('table', 'index', 'trigger')";
    }

    public compileDropAllViews(): string
    {
        return "delete from sqlite_master where type in ('view')";
    }

    public compileRebuild(): string
    {
        return 'vacuum';
    }

    public compileDropColumn(blueprint: Blueprint, command: Fluent, connection: Connection): string[]
    {
        throw new RuntimeException('SQLite does not support dropping columns.');
    }

    public compileDropUnique(blueprint: Blueprint, command: Fluent): string
    {
        return `drop index ${ this.wrap(command.index) }`;
    }

    public compileDropIndex(blueprint: Blueprint, command: Fluent): string
    {
        return `drop index ${ this.wrap(command.index) }`;
    }

    public compileDropSpatialIndex(blueprint: Blueprint, command: Fluent): void
    {
        throw new RuntimeException('The database driver in use does not support spatial indexes.');
    }

    public compileRename(blueprint: Blueprint, command: Fluent): string
    {
        return `alter table ${ this.wrapTable(blueprint) } rename to ${ this.wrapTable(command.to) }`;
    }

    public compileRenameIndex(blueprint: Blueprint, command: Fluent, connection: Connection): string[]
    {
        throw new RuntimeException('SQLite does not support renaming indexes.');
    }

    public compileEnableForeignKeyConstraints(): string
    {
        return 'PRAGMA foreign_keys = ON;';
    }

    public compileDisableForeignKeyConstraints(): string
    {
        return 'PRAGMA foreign_keys = OFF;';
    }

    public compileEnableWriteableSchema(): string
    {
        return 'PRAGMA writable_schema = 1;';
    }

    public compileDisableWriteableSchema(): string
    {
        return 'PRAGMA writable_schema = 0;';
    }

    protected typeChar(column: Fluent): string
    {
        return 'varchar';
    }

    protected typeString(column: Fluent): string
    {
        return 'varchar';
    }

    protected typeTinyText(column: Fluent): string
    {
        return 'text';
    }

    protected typeText(column: Fluent): string
    {
        return 'text';
    }

    protected typeMediumText(column: Fluent): string
    {
        return 'text';
    }

    protected typeLongText(column: Fluent): string
    {
        return 'text';
    }

    protected typeBigInteger(column: Fluent): string
    {
        return 'integer';
    }

    protected typeInteger(column: Fluent): string
    {
        return 'integer';
    }

    protected typeMediumInteger(column: Fluent): string
    {
        return 'integer';
    }

    protected typeTinyInteger(column: Fluent): string
    {
        return 'integer';
    }

    protected typeSmallInteger(column: Fluent): string
    {
        return 'integer';
    }

    protected typeFloat(column: Fluent): string
    {
        return 'float';
    }

    protected typeDouble(column: Fluent): string
    {
        return 'double';
    }

    protected typeDecimal(column: Fluent): string
    {
        return 'numeric';
    }

    protected typeBoolean(column: Fluent): string
    {
        return 'tinyint(1)';
    }

    protected typeEnum(column: Fluent): string
    {
        return `varchar check ("${ column.name }" in (${ this.quoteString(column.allowed) }))`;
    }

    protected typeJson(column: Fluent): string
    {
        return 'text';
    }

    protected typeJsonb(column: Fluent): string
    {
        return 'text';
    }

    protected typeDate(column: Fluent): string
    {
        return 'date';
    }

    protected typeDateTime(column: Fluent): string
    {
        return this.typeTimestamp(column);
    }

    protected typeDateTimeTz(column: Fluent): string
    {
        return this.typeDateTime(column);
    }

    protected typeTime(column: Fluent): string
    {
        return 'time';
    }

    protected typeTimeTz(column: Fluent): string
    {
        return this.typeTime(column);
    }

    protected typeTimestamp(column: Fluent): string
    {
        if (column.useCurrent)
        {
            column.default(new Expression('CURRENT_TIMESTAMP'));
        }

        return 'datetime';
    }

    protected typeTimestampTz(column: Fluent): string
    {
        return this.typeTimestamp(column);
    }

    protected typeYear(column: Fluent): string
    {
        return this.typeInteger(column);
    }

    protected typeBinary(column: Fluent): string
    {
        return 'blob';
    }

    protected typeUuid(column: Fluent): string
    {
        return 'varchar';
    }

    protected typeIpAddress(column: Fluent): string
    {
        return 'varchar';
    }

    protected typeMacAddress(column: Fluent): string
    {
        return 'varchar';
    }

    protected typeGeometry(column: Fluent): string
    {
        return 'geometry';
    }

    protected typeGeography(column: Fluent): string
    {
        return this.typeGeometry(column);
    }

    protected typeComputed(column: Fluent): void
    {
        throw new RuntimeException('This database driver requires a type, see the virtualAs / storedAs modifiers.');
    }

    protected modifyVirtualAs(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.virtualAs !== null)
        {
            return ` as (${ this.getValue(column.virtualAs) })`;
        }

        return null;
    }

    protected modifyStoredAs(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.storedAs !== null)
        {
            return ` as (${ this.getValue(column.storedAs) }) stored`;
        }

        return null;
    }

    protected modifyNullable(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.nullable !== false)
        {
            return '';
        }

        return ' not null';
    }

    protected modifyDefault(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.default !== null)
        {
            return ' default ' + this.getDefaultValue(column.default);
        }

        return null;
    }

    protected modifyIncrement(blueprint: Blueprint, column: Fluent): string | null
    {
        if (this.serials.includes(column.type) && column.autoIncrement)
        {
            return ' primary key autoincrement';
        }

        return null;
    }

    protected modifyCollate(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.collation !== null)
        {
            return ` collate '${ column.collation }'`;
        }

        return null;
    }

    protected wrapJsonSelector(value: string): string
    {
        const [field, path] = this.wrapJsonFieldAndPath(value);
        return `json_extract(${ field }${ path })`;
    }
}

