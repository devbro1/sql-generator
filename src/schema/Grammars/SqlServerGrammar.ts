import { Grammar } from "./Grammar";
import { Blueprint } from "../Blueprint";

export class SqlServerGrammar extends Grammar
{
    protected transactions = true;
    protected modifiers = ['Collate', 'Nullable', 'Default', 'Persisted', 'Increment'];
    protected serials = ['tinyInteger', 'smallInteger', 'mediumInteger', 'integer', 'bigInteger'];
    protected fluentCommands = ['Default'];

    public compileCreateDatabase(name: string, connection: Connection): string
    {
        return `create database ${ this.wrapValue(name) }`;
    }

    public compileDropDatabaseIfExists(name: string): string
    {
        return `drop database if exists ${ this.wrapValue(name) }`;
    }

    public compileTables(): string
    {
        return 'select t.name as name, schema_name(t.schema_id) as [schema], sum(u.total_pages) * 8 * 1024 as size ' +
            'from sys.tables as t ' +
            'join sys.partitions as p on p.object_id = t.object_id ' +
            'join sys.allocation_units as u on u.container_id = p.hobt_id ' +
            'group by t.name, t.schema_id ' +
            'order by t.name';
    }

    public compileViews(): string
    {
        return 'select name, schema_name(v.schema_id) as [schema], definition from sys.views as v ' +
            'inner join sys.sql_modules as m on v.object_id = m.object_id ' +
            'order by name';
    }

    public compileColumns(schema: string, table: string): string
    {
        return `select col.name, type.name as type_name, ` +
            `col.max_length as length, col.precision as precision, col.scale as places, ` +
            `col.is_nullable as nullable, def.definition as [default], ` +
            `col.is_identity as autoincrement, col.collation_name as collation, ` +
            `com.definition as [expression], is_persisted as [persisted], ` +
            `cast(prop.value as nvarchar(max)) as comment ` +
            `from sys.columns as col ` +
            `join sys.types as type on col.user_type_id = type.user_type_id ` +
            `join sys.objects as obj on col.object_id = obj.object_id ` +
            `join sys.schemas as scm on obj.schema_id = scm.schema_id ` +
            `left join sys.default_constraints def on col.default_object_id = def.object_id and col.object_id = def.parent_object_id ` +
            `left join sys.extended_properties as prop on obj.object_id = prop.major_id and col.column_id = prop.minor_id and prop.name = 'MS_Description' ` +
            `left join sys.computed_columns as com on col.column_id = com.column_id ` +
            `where obj.type in ('U', 'V') and obj.name = ${ this.quoteString(table) } and scm.name = ${ schema ? this.quoteString(schema) : 'schema_name()' } ` +
            `order by col.column_id`;
    }

    public compileIndexes(schema: string, table: string): string
    {
        return `select idx.name as name, string_agg(col.name, ',') within group (order by idxcol.key_ordinal) as columns, ` +
            `idx.type_desc as [type], idx.is_unique as [unique], idx.is_primary_key as [primary] ` +
            `from sys.indexes as idx ` +
            `join sys.tables as tbl on idx.object_id = tbl.object_id ` +
            `join sys.schemas as scm on tbl.schema_id = scm.schema_id ` +
            `join sys.index_columns as idxcol on idx.object_id = idxcol.object_id and idx.index_id = idxcol.index_id ` +
            `join sys.columns as col on idxcol.object_id = col.object_id and idxcol.column_id = col.column_id ` +
            `where tbl.name = ${ this.quoteString(table) } and scm.name = ${ schema ? this.quoteString(schema) : 'schema_name()' } ` +
            `group by idx.name, idx.type_desc, idx.is_unique, idx.is_primary_key`;
    }

    public compileForeignKeys(schema: string, table: string): string
    {
        return `select fk.name as name, ` +
            `string_agg(lc.name, ',') within group (order by fkc.constraint_column_id) as columns, ` +
            `fs.name as foreign_schema, ft.name as foreign_table, ` +
            `string_agg(fc.name, ',') within group (order by fkc.constraint_column_id) as foreign_columns, ` +
            `fk.update_referential_action_desc as on_update, ` +
            `fk.delete_referential_action_desc as on_delete ` +
            `from sys.foreign_keys as fk ` +
            `join sys.foreign_key_columns as fkc on fkc.constraint_object_id = fk.object_id ` +
            `join sys.tables as lt on lt.object_id = fk.parent_object_id ` +
            `join sys.schemas as ls on lt.schema_id = ls.schema_id ` +
            `join sys.columns as lc on fkc.parent_object_id = lc.object_id and fkc.parent_column_id = lc.column_id ` +
            `join sys.tables as ft on ft.object_id = fk.referenced_object_id ` +
            `join sys.schemas as fs on ft.schema_id = fs.schema_id ` +
            `join sys.columns as fc on fkc.referenced_object_id = fc.object_id and fkc.referenced_column_id = fc.column_id ` +
            `where lt.name = ${ this.quoteString(table) } and ls.name = ${ schema ? this.quoteString(schema) : 'schema_name()' } ` +
            `group by fk.name, fs.name, ft.name, fk.update_referential_action_desc, fk.delete_referential_action_desc`;
    }

    public compileCreate(blueprint: Blueprint, command: Fluent): string
    {
        return `create table ${ this.wrapTable(blueprint) } (${ this.getColumns(blueprint).join(', ') })`;
    }

    public compileAdd(blueprint: Blueprint, command: Fluent): string
    {
        return `alter table ${ this.wrapTable(blueprint) } add ${ this.getColumns(blueprint).join(', ') }`;
    }

    public compileRenameColumn(blueprint: Blueprint, command: Fluent, connection: Connection): string
    {
        return `sp_rename ${ this.quoteString(this.wrapTable(blueprint) + '.' + this.wrap(command.from)) }, ${ this.wrap(command.to) }, 'COLUMN'`;
    }

    public compileChange(blueprint: Blueprint, command: Fluent, connection: Connection): string[]
    {
        throw new RuntimeException('SQL Server does not support altering columns.');
    }

    public compilePrimary(blueprint: Blueprint, command: Fluent): string
    {
        return `alter table ${ this.wrapTable(blueprint) } add constraint ${ this.wrap(command.index) } primary key (${ this.columnize(command.columns) })`;
    }

    public compileUnique(blueprint: Blueprint, command: Fluent): string
    {
        return `create unique index ${ this.wrap(command.index) } on ${ this.wrapTable(blueprint) } (${ this.columnize(command.columns) })`;
    }

    public compileIndex(blueprint: Blueprint, command: Fluent): string
    {
        return `create index ${ this.wrap(command.index) } on ${ this.wrapTable(blueprint) } (${ this.columnize(command.columns) })`;
    }

    public compileSpatialIndex(blueprint: Blueprint, command: Fluent): string
    {
        return `create spatial index ${ this.wrap(command.index) } on ${ this.wrapTable(blueprint) } (${ this.columnize(command.columns) })`;
    }

    public compileDefault(blueprint: Blueprint, command: Fluent): string | null
    {
        if (command.column.change && command.column.default !== null)
        {
            return `alter table ${ this.wrapTable(blueprint) } add default ${ this.getDefaultValue(command.column.default) } for ${ this.wrap(command.column) }`;
        }

        return null;
    }

    public compileDrop(blueprint: Blueprint, command: Fluent): string
    {
        return `drop table ${ this.wrapTable(blueprint) }`;
    }

    public compileDropIfExists(blueprint: Blueprint, command: Fluent): string
    {
        return `if object_id(${ this.quoteString(this.wrapTable(blueprint)) }, 'U') is not null drop table ${ this.wrapTable(blueprint) }`;
    }

    public compileDropAllTables(): string
    {
        return "EXEC sp_msforeachtable 'DROP TABLE ?'";
    }

    public compileDropColumn(blueprint: Blueprint, command: Fluent): string
    {
        const columns = this.wrapArray(command.columns);
        const dropExistingConstraintsSql = this.compileDropDefaultConstraint(blueprint, command) + ';';
        return `${ dropExistingConstraintsSql }alter table ${ this.wrapTable(blueprint) } drop column ${ columns.join(', ') }`;
    }

    public compileDropDefaultConstraint(blueprint: Blueprint, command: Fluent): string
    {
        const columns = command.name === 'change'
            ? "'" + collect(blueprint.getChangedColumns()).pluck('name').join("','") + "'"
            : "'" + command.columns.join("','") + "'";

        const table = this.wrapTable(blueprint);
        const tableName = this.quoteString(this.wrapTable(blueprint));

        let sql = "DECLARE @sql NVARCHAR(MAX) = '';";
        sql += `SELECT @sql += 'ALTER TABLE ${ table } DROP CONSTRAINT ' + OBJECT_NAME([default_object_id]) + ';' `;
        sql += 'FROM sys.columns ';
        sql += `WHERE [object_id] = OBJECT_ID(${ tableName }) AND [name] in (${ columns }) AND [default_object_id] <> 0;`;
        sql += 'EXEC(@sql)';

        return sql;
    }

    public compileDropPrimary(blueprint: Blueprint, command: Fluent): string
    {
        return `alter table ${ this.wrapTable(blueprint) } drop constraint ${ this.wrap(command.index) }`;
    }

    public compileDropUnique(blueprint: Blueprint, command: Fluent): string
    {
        return `drop index ${ this.wrap(command.index) } on ${ this.wrapTable(blueprint) }`;
    }

    public compileDropIndex(blueprint: Blueprint, command: Fluent): string
    {
        return `drop index ${ this.wrap(command.index) } on ${ this.wrapTable(blueprint) }`;
    }

    public compileDropSpatialIndex(blueprint: Blueprint, command: Fluent): string
    {
        return this.compileDropIndex(blueprint, command);
    }

    public compileDropForeign(blueprint: Blueprint, command: Fluent): string
    {
        return `alter table ${ this.wrapTable(blueprint) } drop constraint ${ this.wrap(command.index) }`;
    }

    public compileRename(blueprint: Blueprint, command: Fluent): string
    {
        return `sp_rename ${ this.quoteString(this.wrapTable(blueprint)) }, ${ this.wrapTable(command.to) }`;
    }

    public compileRenameIndex(blueprint: Blueprint, command: Fluent): string
    {
        return `sp_rename ${ this.quoteString(this.wrapTable(blueprint) + '.' + this.wrap(command.from)) }, ${ this.wrap(command.to) }, 'INDEX'`;
    }

    public compileEnableForeignKeyConstraints(): string
    {
        return 'EXEC sp_msforeachtable @command1="print \'?\'", @command2="ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all";';
    }

    public compileDisableForeignKeyConstraints(): string
    {
        return 'EXEC sp_msforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all";';
    }

    public compileDropAllForeignKeys(): string
    {
        return "DECLARE @sql NVARCHAR(MAX) = N''; " +
            "SELECT @sql += 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' DROP CONSTRAINT ' + QUOTENAME(name) + ';' " +
            "FROM sys.foreign_keys; " +
            "EXEC sp_executesql @sql;";
    }

    public compileDropAllViews(): string
    {
        return "DECLARE @sql NVARCHAR(MAX) = N''; " +
            "SELECT @sql += 'DROP VIEW ' + QUOTENAME(OBJECT_SCHEMA_NAME(object_id)) + '.' + QUOTENAME(name) + ';' " +
            "FROM sys.views; " +
            "EXEC sp_executesql @sql;";
    }

    protected typeChar(column: Fluent): string
    {
        return `nchar(${ column.length })`;
    }

    protected typeString(column: Fluent): string
    {
        return `nvarchar(${ column.length })`;
    }

    protected typeTinyText(column: Fluent): string
    {
        return 'nvarchar(255)';
    }

    protected typeText(column: Fluent): string
    {
        return 'nvarchar(max)';
    }

    protected typeMediumText(column: Fluent): string
    {
        return 'nvarchar(max)';
    }

    protected typeLongText(column: Fluent): string
    {
        return 'nvarchar(max)';
    }

    protected typeBigInteger(column: Fluent): string
    {
        return 'bigint';
    }

    protected typeInteger(column: Fluent): string
    {
        return 'int';
    }

    protected typeMediumInteger(column: Fluent): string
    {
        return 'int';
    }

    protected typeTinyInteger(column: Fluent): string
    {
        return 'tinyint';
    }

    protected typeSmallInteger(column: Fluent): string
    {
        return 'smallint';
    }

    protected typeFloat(column: Fluent): string
    {
        return column.precision ? `float(${ column.precision })` : 'float';
    }

    protected typeDouble(column: Fluent): string
    {
        return 'double precision';
    }

    protected typeDecimal(column: Fluent): string
    {
        return `decimal(${ column.total }, ${ column.places })`;
    }

    protected typeBoolean(column: Fluent): string
    {
        return 'bit';
    }

    protected typeEnum(column: Fluent): string
    {
        return `nvarchar(255) check ("${ column.name }" in (${ this.quoteString(column.allowed) }))`;
    }

    protected typeJson(column: Fluent): string
    {
        return 'nvarchar(max)';
    }

    protected typeJsonb(column: Fluent): string
    {
        return 'nvarchar(max)';
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
        return this.typeTimestampTz(column);
    }

    protected typeTime(column: Fluent): string
    {
        return column.precision ? `time(${ column.precision })` : 'time';
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
        return column.precision ? `datetime2(${ column.precision })` : 'datetime';
    }

    protected typeTimestampTz(column: Fluent): string
    {
        if (column.useCurrent)
        {
            column.default(new Expression('CURRENT_TIMESTAMP'));
        }
        return column.precision ? `datetimeoffset(${ column.precision })` : 'datetimeoffset';
    }

    protected typeYear(column: Fluent): string
    {
        return this.typeInteger(column);
    }

    protected typeBinary(column: Fluent): string
    {
        return column.length ? (column.fixed ? `binary(${ column.length })` : `varbinary(${ column.length })`) : 'varbinary(max)';
    }

    protected typeUuid(column: Fluent): string
    {
        return 'uniqueidentifier';
    }

    protected typeIpAddress(column: Fluent): string
    {
        return 'nvarchar(45)';
    }

    protected typeMacAddress(column: Fluent): string
    {
        return 'nvarchar(17)';
    }

    protected typeGeometry(column: Fluent): string
    {
        return 'geometry';
    }

    protected typeGeography(column: Fluent): string
    {
        return 'geography';
    }

    protected typeComputed(column: Fluent): string | null
    {
        return `as (${ this.getValue(column.expression) })`;
    }

    protected modifyCollate(blueprint: Blueprint, column: Fluent): string | null
    {
        return column.collation ? ` collate ${ column.collation }` : null;
    }

    protected modifyNullable(blueprint: Blueprint, column: Fluent): string | null
    {
        return column.type !== 'computed' ? (column.nullable ? ' null' : ' not null') : null;
    }

    protected modifyDefault(blueprint: Blueprint, column: Fluent): string | null
    {
        return (!column.change && column.default !== null) ? ` default ${ this.getDefaultValue(column.default) }` : null;
    }

    protected modifyIncrement(blueprint: Blueprint, column: Fluent): string | null
    {
        return (!column.change && this.serials.includes(column.type) && column.autoIncrement) ?
            (this.hasCommand(blueprint, 'primary') ? ' identity' : ' identity primary key') : null;
    }

    protected modifyPersisted(blueprint: Blueprint, column: Fluent): string | null
    {
        return column.change ? (column.type === 'computed' ? (column.persisted ? ' add persisted' : ' drop persisted') : null) : (column.persisted ? ' persisted' : null);
    }
}
