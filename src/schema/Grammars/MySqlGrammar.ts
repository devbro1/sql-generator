import { Grammar } from "./Grammar";
import { Blueprint } from "../Blueprint";
import { Connection } from "../../Illuminate/Connection";
import { ColumnDefinition } from "../ColumnDefinition";
import { Expression } from "../../Illuminate/Expression";

export class MySqlGrammar extends Grammar
{
    protected modifiers = [
        'Unsigned', 'Charset', 'Collate', 'VirtualAs', 'StoredAs', 'Nullable',
        'Default', 'OnUpdate', 'Invisible', 'Increment', 'Comment', 'After', 'First',
    ];

    protected serials = ['bigInteger', 'integer', 'mediumInteger', 'smallInteger', 'tinyInteger'];

    protected fluentCommands = ['AutoIncrementStartingValues'];

    public compileCreateDatabase(name: string, connection: Connection): string
    {
        const charset = connection.getConfig('charset');
        const collation = connection.getConfig('collation');

        if (!charset || !collation)
        {
            return `create database ${ this.wrapValue(name) }`;
        }

        return `create database ${ this.wrapValue(name) } default character set ${ this.wrapValue(charset) } default collate ${ this.wrapValue(collation) }`;
    }

    public compileDropDatabaseIfExists(name: string): string
    {
        return `drop database if exists ${ this.wrapValue(name) }`;
    }

    public compileTables(database: string): string
    {
        return `select table_name as \`name\`, (data_length + index_length) as \`size\`, ` +
            `table_comment as \`comment\`, engine as \`engine\`, table_collation as \`collation\` ` +
            `from information_schema.tables where table_schema = ${ this.quoteString(database) } and table_type in ('BASE TABLE', 'SYSTEM VERSIONED') ` +
            `order by table_name`;
    }

    public compileViews(database: string): string
    {
        return `select table_name as \`name\`, view_definition as \`definition\` ` +
            `from information_schema.views where table_schema = ${ this.quoteString(database) } ` +
            `order by table_name`;
    }

    public compileColumns(database: string, table: string): string
    {
        return `select column_name as \`name\`, data_type as \`type_name\`, column_type as \`type\`, ` +
            `collation_name as \`collation\`, is_nullable as \`nullable\`, ` +
            `column_default as \`default\`, column_comment as \`comment\`, ` +
            `generation_expression as \`expression\`, extra as \`extra\` ` +
            `from information_schema.columns where table_schema = ${ this.quoteString(database) } and table_name = ${ this.quoteString(table) } ` +
            `order by ordinal_position asc`;
    }

    public compileIndexes(database: string, table: string): string
    {
        return `select index_name as \`name\`, group_concat(column_name order by seq_in_index) as \`columns\`, ` +
            `index_type as \`type\`, not non_unique as \`unique\` ` +
            `from information_schema.statistics where table_schema = ${ this.quoteString(database) } and table_name = ${ this.quoteString(table) } ` +
            `group by index_name, index_type, non_unique`;
    }

    public compileForeignKeys(database: string, table: string): string
    {
        return `select kc.constraint_name as \`name\`, ` +
            `group_concat(kc.column_name order by kc.ordinal_position) as \`columns\`, ` +
            `kc.referenced_table_schema as \`foreign_schema\`, ` +
            `kc.referenced_table_name as \`foreign_table\`, ` +
            `group_concat(kc.referenced_column_name order by kc.ordinal_position) as \`foreign_columns\`, ` +
            `rc.update_rule as \`on_update\`, ` +
            `rc.delete_rule as \`on_delete\` ` +
            `from information_schema.key_column_usage kc join information_schema.referential_constraints rc ` +
            `on kc.constraint_schema = rc.constraint_schema and kc.constraint_name = rc.constraint_name ` +
            `where kc.table_schema = ${ this.quoteString(database) } and kc.table_name = ${ this.quoteString(table) } and kc.referenced_table_name is not null ` +
            `group by kc.constraint_name, kc.referenced_table_schema, kc.referenced_table_name, rc.update_rule, rc.delete_rule`;
    }

    public compileCreate(blueprint: Blueprint, command: any, connection: Connection): string
    {
        let sql = this.compileCreateTable(blueprint, command, connection);

        sql = this.compileCreateEncoding(sql, connection, blueprint);

        return this.compileCreateEngine(sql, connection, blueprint);
    }

    protected compileCreateTable(blueprint: Blueprint, command: any, connection: Connection): string
    {
        const tableStructure = this.getColumns(blueprint);

        const primaryKey = this.getCommandByName(blueprint, 'primary');
        if (primaryKey)
        {
            tableStructure.push(`primary key ${ primaryKey.algorithm ? 'using ' + primaryKey.algorithm : '' }(${ this.columnize(primaryKey.columns) })`);
            primaryKey.shouldBeSkipped = true;
        }

        return `${ blueprint.properties.temporary ? 'create temporary' : 'create' } table ${ this.wrapTable(blueprint) } (${ tableStructure.join(', ') })`;
    }

    protected compileCreateEncoding(sql: string, connection: Connection, blueprint: Blueprint): string
    {
        if (blueprint.charset)
        {
            sql += ` default character set ${ blueprint.charset }`;
        } else if (connection.getConfig('charset'))
        {
            sql += ` default character set ${ connection.getConfig('charset') }`;
        }

        if (blueprint.collation)
        {
            sql += ` collate '${ blueprint.collation }'`;
        } else if (connection.getConfig('collation'))
        {
            sql += ` collate '${ connection.getConfig('collation') }'`;
        }

        return sql;
    }

    protected compileCreateEngine(sql: string, connection: Connection, blueprint: Blueprint): string
    {
        if (blueprint.engine)
        {
            return `${ sql } engine = ${ blueprint.engine }`;
        } else if (connection.getConfig('engine'))
        {
            return `${ sql } engine = ${ connection.getConfig('engine') }`;
        }

        return sql;
    }

    public compileAdd(blueprint: Blueprint, command: any): string
    {
        const columns = this.prefixArray('add', this.getColumns(blueprint));

        return `alter table ${ this.wrapTable(blueprint) } ${ columns.join(', ') }`;
    }

    public compileAutoIncrementStartingValues(blueprint: Blueprint, command: any): string
    {
        if (command.column.autoIncrement && command.column.get('startingValue', command.column.get('from')))
        {
            return `alter table ${ this.wrapTable(blueprint) } auto_increment = ${ command.column.get('startingValue', command.column.get('from')) }`;
        }

        return '';
    }

    public compileRenameColumn(blueprint: Blueprint, command: any, connection: Connection): string
    {
        const version = connection.getServerVersion();

        if ((connection.isMaria() && version.localeCompare('10.5.2', '<')) ||
            (!connection.isMaria() && version.localeCompare('8.0.3', '<')))
        {
            const column = connection.getSchemaBuilder().getColumns(blueprint.getTable())
                .find((column: ColumnDefinition) => column.properties.name === command.from);

            const modifiers = this.addModifiers(column['type'], blueprint, new ColumnDefinition({
                'change': true,
                'type': column['type_name'] === 'bigint' ? 'bigInteger' :
                    column['type_name'] === 'int' ? 'integer' :
                        column['type_name'] === 'mediumint' ? 'mediumInteger' :
                            column['type_name'] === 'smallint' ? 'smallInteger' :
                                column['type_name'] === 'tinyint' ? 'tinyInteger' : column['type_name'],
                'nullable': column['nullable'],
                'default': column['default'] && column['default'].toLowerCase().startsWith('current_timestamp') ?
                    new Expression(column['default']) : column['default'],
                'autoIncrement': column['auto_increment'],
                'collation': column['collation'],
                'comment': column['comment'],
                'virtualAs': column['generation'] !== null && column['generation']['type'] === 'virtual' ?
                    column['generation']['expression'] : null,
                'storedAs': column['generation'] !== null && column['generation']['type'] === 'stored' ?
                    column['generation']['expression'] : null,
            }));

            return `alter table ${ this.wrapTable(blueprint) } change ${ this.wrap(command.from) } ${ this.wrap(command.to) } ${ modifiers }`;
        }

        return super.compileRenameColumn(blueprint, command, connection);
    }

    public compileChange(blueprint: Blueprint, command: any, connection: Connection): string | string[]
    {
        const columns = [];

        for (const column of blueprint.getChangedColumns())
        {
            const sql = `${ column.properties.renameTo === '' ? 'modify' : 'change' } ${ this.wrap(column) }${ column.properties.renameTo === '' ? '' : ' ' + this.wrap(column.properties.renameTo) } ${ this.getType(column) }`;

            columns.push(this.addModifiers(sql, blueprint, column));
        }

        return `alter table ${ this.wrapTable(blueprint) } ${ columns.join(', ') }`;
    }

    public compilePrimary(blueprint: Blueprint, command: any): string
    {
        return `alter table ${ this.wrapTable(blueprint) } add primary key ${ command.algorithm ? 'using ' + command.algorithm : '' }(${ this.columnize(command.columns) })`;
    }

    public compileUnique(blueprint: Blueprint, command: any): string
    {
        return this.compileKey(blueprint, command, 'unique');
    }

    public compileIndex(blueprint: Blueprint, command: any): string
    {
        return this.compileKey(blueprint, command, 'index');
    }

    public compileFullText(blueprint: Blueprint, command: any): string
    {
        return this.compileKey(blueprint, command, 'fulltext');
    }

    public compileSpatialIndex(blueprint: Blueprint, command: any): string
    {
        return this.compileKey(blueprint, command, 'spatial index');
    }

    protected compileKey(blueprint: Blueprint, command: any, type: string): string
    {
        return `alter table ${ this.wrapTable(blueprint) } add ${ type } ${ this.wrap(command.index) }${ command.algorithm ? ' using ' + command.algorithm : '' }(${ this.columnize(command.columns) })`;
    }

    public compileDrop(blueprint: Blueprint, command: any): string
    {
        return `drop table ${ this.wrapTable(blueprint) }`;
    }

    public compileDropIfExists(blueprint: Blueprint, command: any): string
    {
        return `drop table if exists ${ this.wrapTable(blueprint) }`;
    }

    public compileDropColumn(blueprint: Blueprint, command: any): string
    {
        const columns = this.prefixArray('drop', this.wrapArray(command.columns));

        return `alter table ${ this.wrapTable(blueprint) } ${ columns.join(', ') }`;
    }

    public compileDropPrimary(blueprint: Blueprint, command: any): string
    {
        return `alter table ${ this.wrapTable(blueprint) } drop primary key`;
    }

    public compileDropUnique(blueprint: Blueprint, command: any): string
    {
        const index = this.wrap(command.index);

        return `alter table ${ this.wrapTable(blueprint) } drop index ${ index }`;
    }

    public compileDropIndex(blueprint: Blueprint, command: any): string
    {
        const index = this.wrap(command.index);

        return `alter table ${ this.wrapTable(blueprint) } drop index ${ index }`;
    }

    public compileDropFullText(blueprint: Blueprint, command: any): string
    {
        return this.compileDropIndex(blueprint, command);
    }

    public compileDropSpatialIndex(blueprint: Blueprint, command: any): string
    {
        return this.compileDropIndex(blueprint, command);
    }

    public compileDropForeign(blueprint: Blueprint, command: any): string
    {
        const index = this.wrap(command.index);

        return `alter table ${ this.wrapTable(blueprint) } drop foreign key ${ index }`;
    }

    public compileRename(blueprint: Blueprint, command: any): string
    {
        const from = this.wrapTable(blueprint);

        return `rename table ${ from } to ${ this.wrapTable(command.to) }`;
    }

    public compileRenameIndex(blueprint: Blueprint, command: any): string
    {
        return `alter table ${ this.wrapTable(blueprint) } rename index ${ this.wrap(command.from) } to ${ this.wrap(command.to) }`;
    }

    public compileDropAllTables(tables: string[]): string
    {
        return `drop table ${ tables.map(table => this.wrap(table)).join(',') }`;
    }

    public compileDropAllViews(views: string[]): string
    {
        return `drop view ${ views.map(view => this.wrap(view)).join(',') }`;
    }

    public compileEnableForeignKeyConstraints(): string
    {
        return 'SET FOREIGN_KEY_CHECKS=1;';
    }

    public compileDisableForeignKeyConstraints(): string
    {
        return 'SET FOREIGN_KEY_CHECKS=0;';
    }

    public compileTableComment(blueprint: Blueprint, command: any): string
    {
        return `alter table ${ this.wrapTable(blueprint) } comment = '${ command.comment.replace("'", "''") }'`;
    }

    protected typeChar(column: ColumnDefinition): string
    {
        return `char(${ column.get('length') })`;
    }

    protected typeString(column: ColumnDefinition): string
    {
        return `varchar(${ column.get('length') })`;
    }

    protected typeTinyText(column: ColumnDefinition): string
    {
        return 'tinytext';
    }

    protected typeText(column: ColumnDefinition): string
    {
        return 'text';
    }

    protected typeMediumText(column: ColumnDefinition): string
    {
        return 'mediumtext';
    }

    protected typeLongText(column: ColumnDefinition): string
    {
        return 'longtext';
    }

    protected typeBigInteger(column: ColumnDefinition): string
    {
        return 'bigint';
    }

    protected typeInteger(column: ColumnDefinition): string
    {
        return 'int';
    }

    protected typeMediumInteger(column: ColumnDefinition): string
    {
        return 'mediumint';
    }

    protected typeTinyInteger(column: ColumnDefinition): string
    {
        return 'tinyint';
    }

    protected typeSmallInteger(column: ColumnDefinition): string
    {
        return 'smallint';
    }

    protected typeFloat(column: any): string
    {
        if (column.precision)
        {
            return `float(${ column.precision })`;
        }

        return 'float';
    }

    protected typeDouble(column: any): string
    {
        return 'double';
    }

    protected typeDecimal(column: any): string
    {
        return `decimal(${ column.total }, ${ column.places })`;
    }

    protected typeBoolean(column: any): string
    {
        return 'tinyint(1)';
    }

    protected typeEnum(column: any): string
    {
        return `enum(${ this.quoteString(column.allowed) })`;
    }

    protected typeSet(column: any): string
    {
        return `set(${ this.quoteString(column.allowed) })`;
    }

    protected typeJson(column: any): string
    {
        return 'json';
    }

    protected typeJsonb(column: any): string
    {
        return 'json';
    }

    protected typeDate(column: any): string
    {
        return 'date';
    }

    protected typeDateTime(column: any): string
    {
        const current = column.precision ? `CURRENT_TIMESTAMP(${ column.precision })` : 'CURRENT_TIMESTAMP';

        if (column.useCurrent)
        {
            column.default(new Expression(current));
        }

        if (column.useCurrentOnUpdate)
        {
            column.onUpdate(new Expression(current));
        }

        return column.precision ? `datetime(${ column.precision })` : 'datetime';
    }

    protected typeDateTimeTz(column: any): string
    {
        return this.typeDateTime(column);
    }

    protected typeTime(column: any): string
    {
        return column.precision ? `time(${ column.precision })` : 'time';
    }

    protected typeTimeTz(column: any): string
    {
        return this.typeTime(column);
    }

    protected typeTimestamp(column: any): string
    {
        const current = column.precision ? `CURRENT_TIMESTAMP(${ column.precision })` : 'CURRENT_TIMESTAMP';

        if (column.useCurrent)
        {
            column.default(new Expression(current));
        }

        if (column.useCurrentOnUpdate)
        {
            column.onUpdate(new Expression(current));
        }

        return column.precision ? `timestamp(${ column.precision })` : 'timestamp';
    }

    protected typeTimestampTz(column: any): string
    {
        return this.typeTimestamp(column);
    }

    protected typeYear(column: any): string
    {
        return 'year';
    }

    protected typeBinary(column: any): string
    {
        if (column.length)
        {
            return column.fixed ? `binary(${ column.length })` : `varbinary(${ column.length })`;
        }

        return 'blob';
    }

    protected typeUuid(column: any): string
    {
        return 'char(36)';
    }

    protected typeIpAddress(column: any): string
    {
        return 'varchar(45)';
    }

    protected typeMacAddress(column: any): string
    {
        return 'varchar(17)';
    }

    protected typeGeometry(column: any): string
    {
        let subtype = column.subtype ? column.subtype.toLowerCase() : '';

        if (!['point', 'linestring', 'polygon', 'geometrycollection', 'multipoint', 'multilinestring', 'multipolygon'].includes(subtype))
        {
            subtype = '';
        }

        return `${ subtype || 'geometry' }${ column.srid && this.connection?.isMaria() ? ' ref_system_id=' + column.srid : (column.srid ? ' srid ' + column.srid : '') }`;
    }

    protected typeGeography(column: any): string
    {
        return this.typeGeometry(column);
    }

    protected typeComputed(column: any): void
    {
        throw new Error('This database driver requires a type, see the virtualAs / storedAs modifiers.');
    }

    protected modifyVirtualAs(blueprint: Blueprint, column: any): string
    {
        if (column.properties.virtualAsJson !== '')
        {
            if (this.isJsonSelector(column.properties.virtualAsJson))
            {
                column.properties.virtualAsJson = this.wrapJsonSelector(column.properties.virtualAsJson);
            }

            return ` as (${ column.properties.virtualAsJson })`;
        }

        if (column.properties.virtualAs !== '')
        {
            return ` as (${ this.getValue(column.properties.virtualAs) })`;
        }

        return '';
    }

    protected modifyStoredAs(blueprint: Blueprint, column: any): string
    {
        if (column.properties.storedAsJson !== '')
        {
            if (this.isJsonSelector(column.properties.storedAsJson))
            {
                column.properties.storedAsJson = this.wrapJsonSelector(column.properties.storedAsJson);
            }

            return ` as (${ column.properties.storedAsJson }) stored`;
        }

        if (column.properties.storedAs !== '')
        {
            return ` as (${ this.getValue(column.properties.storedAs) }) stored`;
        }

        return '';
    }

    protected modifyUnsigned(blueprint: Blueprint, column: ColumnDefinition): string
    {
        if (column.properties.unsigned)
        {
            return ' unsigned';
        }

        return '';
    }

    protected modifyCharset(blueprint: Blueprint, column: any): string
    {
        if (column.properties.charset !== '')
        {
            return ' character set ' + column.charset;
        }

        return '';
    }

    protected modifyCollate(blueprint: Blueprint, column: any): string
    {
        if (column.properties.collation !== '')
        {
            return ` collate '${ column.collation }'`;
        }

        return '';
    }

    protected modifyNullable(blueprint: Blueprint, column: any): string
    {
        if (column.virtualAs === null &&
            column.virtualAsJson === null &&
            column.storedAs === null &&
            column.storedAsJson === null)
        {
            return column.properties.nullable ? ' null' : ' not null';
        }

        if (!column.properties.nullable)
        {
            return ' not null';
        }

        return '';
    }

    protected modifyInvisible(blueprint: Blueprint, column: any): string
    {
        if (column.properties.invisible === true)
        {
            return ' invisible';
        }

        return '';
    }

    protected modifyDefault(blueprint: Blueprint, column: any): string
    {
        if (column.properties.default !== null)
        {
            return ' default ' + this.getDefaultValue(column.default);
        }

        return '';
    }

    protected modifyOnUpdate(blueprint: Blueprint, column: ColumnDefinition): string
    {
        if (column.properties.onUpdate !== '')
        {
            return ' on update ' + this.getValue(column.properties.onUpdate);
        }

        return '';
    }

    protected modifyIncrement(blueprint: Blueprint, column: any): string | null
    {
        if (this.serials.includes(column.properties.type) && column.properties.autoIncrement)
        {
            return this.hasCommand(blueprint, 'primary') || (column.properties.change && !column.properties.primary) ? ' auto_increment' : ' auto_increment primary key';
        }

        return '';
    }

    protected modifyFirst(blueprint: Blueprint, column: ColumnDefinition): string
    {
        if (column.properties.first !== '')
        {
            return ' first';
        }

        return '';
    }

    protected modifyAfter(blueprint: Blueprint, column: any): string
    {
        if (column.properties.after !== '')
        {
            return ' after ' + this.wrap(column.properties.after);
        }

        return '';
    }

    protected modifyComment(blueprint: Blueprint, column: ColumnDefinition): string 
    {
        if (column.properties.comment !== '')
        {
            return ` comment '${ column.properties.comment.replace("'", "''") }'`;
        }

        return '';
    }

    protected wrapValue(value: string): string
    {
        if (value !== '*')
        {
            return '`' + value.replace('`', '``') + '`';
        }

        return value;
    }

    protected wrapJsonSelector(value: string): string
    {
        const [field, path] = this.wrapJsonFieldAndPath(value);

        return 'json_unquote(json_extract(' + field + path + '))';
    }

    isJsonSelector(a:any) {
        return false;
    }
}
