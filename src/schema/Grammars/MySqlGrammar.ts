
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

    public compileCreate(blueprint: Blueprint, command: Fluent, connection: Connection): string
    {
        let sql = this.compileCreateTable(blueprint, command, connection);

        sql = this.compileCreateEncoding(sql, connection, blueprint);

        return this.compileCreateEngine(sql, connection, blueprint);
    }

    protected compileCreateTable(blueprint: Blueprint, command: Fluent, connection: Connection): string
    {
        const tableStructure = this.getColumns(blueprint);

        const primaryKey = this.getCommandByName(blueprint, 'primary');
        if (primaryKey)
        {
            tableStructure.push(`primary key ${ primaryKey.algorithm ? 'using ' + primaryKey.algorithm : '' }(${ this.columnize(primaryKey.columns) })`);
            primaryKey.shouldBeSkipped = true;
        }

        return `${ blueprint.temporary ? 'create temporary' : 'create' } table ${ this.wrapTable(blueprint) } (${ tableStructure.join(', ') })`;
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

    public compileAdd(blueprint: Blueprint, command: Fluent): string
    {
        const columns = this.prefixArray('add', this.getColumns(blueprint));

        return `alter table ${ this.wrapTable(blueprint) } ${ columns.join(', ') }`;
    }

    public compileAutoIncrementStartingValues(blueprint: Blueprint, command: Fluent): string
    {
        if (command.column.autoIncrement && command.column.get('startingValue', command.column.get('from')))
        {
            return `alter table ${ this.wrapTable(blueprint) } auto_increment = ${ command.column.get('startingValue', command.column.get('from')) }`;
        }
    }

    public compileRenameColumn(blueprint: Blueprint, command: Fluent, connection: Connection): string | string[]
    {
        const version = connection.getServerVersion();

        if ((connection.isMaria() && version.localeCompare('10.5.2', '<')) ||
            (!connection.isMaria() && version.localeCompare('8.0.3', '<')))
        {
            const column = connection.getSchemaBuilder().getColumns(blueprint.getTable())
                .find(column => column.name === command.from);

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

    public compileChange(blueprint: Blueprint, command: Fluent, connection: Connection): string | string[]
    {
        const columns = [];

        for (const column of blueprint.getChangedColumns())
        {
            const sql = `${ column.renameTo === null ? 'modify' : 'change' } ${ this.wrap(column) }${ column.renameTo === null ? '' : ' ' + this.wrap(column.renameTo) } ${ this.getType(column) }`;

            columns.push(this.addModifiers(sql, blueprint, column));
        }

        return `alter table ${ this.wrapTable(blueprint) } ${ columns.join(', ') }`;
    }

    public compilePrimary(blueprint: Blueprint, command: Fluent): string
    {
        return `alter table ${ this.wrapTable(blueprint) } add primary key ${ command.algorithm ? 'using ' + command.algorithm : '' }(${ this.columnize(command.columns) })`;
    }

    public compileUnique(blueprint: Blueprint, command: Fluent): string
    {
        return this.compileKey(blueprint, command, 'unique');
    }

    public compileIndex(blueprint: Blueprint, command: Fluent): string
    {
        return this.compileKey(blueprint, command, 'index');
    }

    public compileFullText(blueprint: Blueprint, command: Fluent): string
    {
        return this.compileKey(blueprint, command, 'fulltext');
    }

    public compileSpatialIndex(blueprint: Blueprint, command: Fluent): string
    {
        return this.compileKey(blueprint, command, 'spatial index');
    }

    protected compileKey(blueprint: Blueprint, command: Fluent, type: string): string
    {
        return `alter table ${ this.wrapTable(blueprint) } add ${ type } ${ this.wrap(command.index) }${ command.algorithm ? ' using ' + command.algorithm : '' }(${ this.columnize(command.columns) })`;
    }

    public compileDrop(blueprint: Blueprint, command: Fluent): string
    {
        return `drop table ${ this.wrapTable(blueprint) }`;
    }

    public compileDropIfExists(blueprint: Blueprint, command: Fluent): string
    {
        return `drop table if exists ${ this.wrapTable(blueprint) }`;
    }

    public compileDropColumn(blueprint: Blueprint, command: Fluent): string
    {
        const columns = this.prefixArray('drop', this.wrapArray(command.columns));

        return `alter table ${ this.wrapTable(blueprint) } ${ columns.join(', ') }`;
    }

    public compileDropPrimary(blueprint: Blueprint, command: Fluent): string
    {
        return `alter table ${ this.wrapTable(blueprint) } drop primary key`;
    }

    public compileDropUnique(blueprint: Blueprint, command: Fluent): string
    {
        const index = this.wrap(command.index);

        return `alter table ${ this.wrapTable(blueprint) } drop index ${ index }`;
    }

    public compileDropIndex(blueprint: Blueprint, command: Fluent): string
    {
        const index = this.wrap(command.index);

        return `alter table ${ this.wrapTable(blueprint) } drop index ${ index }`;
    }

    public compileDropFullText(blueprint: Blueprint, command: Fluent): string
    {
        return this.compileDropIndex(blueprint, command);
    }

    public compileDropSpatialIndex(blueprint: Blueprint, command: Fluent): string
    {
        return this.compileDropIndex(blueprint, command);
    }

    public compileDropForeign(blueprint: Blueprint, command: Fluent): string
    {
        const index = this.wrap(command.index);

        return `alter table ${ this.wrapTable(blueprint) } drop foreign key ${ index }`;
    }

    public compileRename(blueprint: Blueprint, command: Fluent): string
    {
        const from = this.wrapTable(blueprint);

        return `rename table ${ from } to ${ this.wrapTable(command.to) }`;
    }

    public compileRenameIndex(blueprint: Blueprint, command: Fluent): string
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

    public compileTableComment(blueprint: Blueprint, command: Fluent): string
    {
        return `alter table ${ this.wrapTable(blueprint) } comment = '${ command.comment.replace("'", "''") }'`;
    }

    protected typeChar(column: Fluent): string
    {
        return `char(${ column.length })`;
    }

    protected typeString(column: Fluent): string
    {
        return `varchar(${ column.length })`;
    }

    protected typeTinyText(column: Fluent): string
    {
        return 'tinytext';
    }

    protected typeText(column: Fluent): string
    {
        return 'text';
    }

    protected typeMediumText(column: Fluent): string
    {
        return 'mediumtext';
    }

    protected typeLongText(column: Fluent): string
    {
        return 'longtext';
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
        return 'mediumint';
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
        if (column.precision)
        {
            return `float(${ column.precision })`;
        }

        return 'float';
    }

    protected typeDouble(column: Fluent): string
    {
        return 'double';
    }

    protected typeDecimal(column: Fluent): string
    {
        return `decimal(${ column.total }, ${ column.places })`;
    }

    protected typeBoolean(column: Fluent): string
    {
        return 'tinyint(1)';
    }

    protected typeEnum(column: Fluent): string
    {
        return `enum(${ this.quoteString(column.allowed) })`;
    }

    protected typeSet(column: Fluent): string
    {
        return `set(${ this.quoteString(column.allowed) })`;
    }

    protected typeJson(column: Fluent): string
    {
        return 'json';
    }

    protected typeJsonb(column: Fluent): string
    {
        return 'json';
    }

    protected typeDate(column: Fluent): string
    {
        return 'date';
    }

    protected typeDateTime(column: Fluent): string
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

    protected typeDateTimeTz(column: Fluent): string
    {
        return this.typeDateTime(column);
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

    protected typeTimestampTz(column: Fluent): string
    {
        return this.typeTimestamp(column);
    }

    protected typeYear(column: Fluent): string
    {
        return 'year';
    }

    protected typeBinary(column: Fluent): string
    {
        if (column.length)
        {
            return column.fixed ? `binary(${ column.length })` : `varbinary(${ column.length })`;
        }

        return 'blob';
    }

    protected typeUuid(column: Fluent): string
    {
        return 'char(36)';
    }

    protected typeIpAddress(column: Fluent): string
    {
        return 'varchar(45)';
    }

    protected typeMacAddress(column: Fluent): string
    {
        return 'varchar(17)';
    }

    protected typeGeometry(column: Fluent): string
    {
        const subtype = column.subtype ? column.subtype.toLowerCase() : null;

        if (!['point', 'linestring', 'polygon', 'geometrycollection', 'multipoint', 'multilinestring', 'multipolygon'].includes(subtype))
        {
            subtype = null;
        }

        return `${ subtype ?? 'geometry' }${ column.srid && this.connection?.isMaria() ? ' ref_system_id=' + column.srid : (column.srid ? ' srid ' + column.srid : '') }`;
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
        if (column.virtualAsJson !== null)
        {
            if (this.isJsonSelector(column.virtualAsJson))
            {
                column.virtualAsJson = this.wrapJsonSelector(column.virtualAsJson);
            }

            return ` as (${ column.virtualAsJson })`;
        }

        if (column.virtualAs !== null)
        {
            return ` as (${ this.getValue(column.virtualAs) })`;
        }

        return null;
    }

    protected modifyStoredAs(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.storedAsJson !== null)
        {
            if (this.isJsonSelector(column.storedAsJson))
            {
                column.storedAsJson = this.wrapJsonSelector(column.storedAsJson);
            }

            return ` as (${ column.storedAsJson }) stored`;
        }

        if (column.storedAs !== null)
        {
            return ` as (${ this.getValue(column.storedAs) }) stored`;
        }

        return null;
    }

    protected modifyUnsigned(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.unsigned)
        {
            return ' unsigned';
        }

        return null;
    }

    protected modifyCharset(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.charset !== null)
        {
            return ' character set ' + column.charset;
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

    protected modifyNullable(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.virtualAs === null &&
            column.virtualAsJson === null &&
            column.storedAs === null &&
            column.storedAsJson === null)
        {
            return column.nullable ? ' null' : ' not null';
        }

        if (!column.nullable)
        {
            return ' not null';
        }

        return null;
    }

    protected modifyInvisible(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.invisible !== null)
        {
            return ' invisible';
        }

        return null;
    }

    protected modifyDefault(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.default !== null)
        {
            return ' default ' + this.getDefaultValue(column.default);
        }

        return null;
    }

    protected modifyOnUpdate(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.onUpdate !== null)
        {
            return ' on update ' + this.getValue(column.onUpdate);
        }

        return null;
    }

    protected modifyIncrement(blueprint: Blueprint, column: Fluent): string | null
    {
        if (this.serials.includes(column.type) && column.autoIncrement)
        {
            return this.hasCommand(blueprint, 'primary') || (column.change && !column.primary) ? ' auto_increment' : ' auto_increment primary key';
        }

        return null;
    }

    protected modifyFirst(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.first !== null)
        {
            return ' first';
        }

        return null;
    }

    protected modifyAfter(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.after !== null)
        {
            return ' after ' + this.wrap(column.after);
        }

        return null;
    }

    protected modifyComment(blueprint: Blueprint, column: Fluent): string | null
    {
        if (column.comment !== null)
        {
            return ` comment '${ column.comment.replace("'", "''") }'`;
        }

        return null;
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
}
