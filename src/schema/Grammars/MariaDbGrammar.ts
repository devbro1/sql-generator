import { MySqlGrammar } from "./MySqlGrammar";

export class MariaDbGrammar extends MySqlGrammar
{

    public compileRenameColumn(blueprint: Blueprint, command: Fluent, connection: Connection): string | string[]
    {
        if (connection.getServerVersion().localeCompare('10.5.2', '<'))
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
            }));

            return `alter table ${ this.wrapTable(blueprint) } change ${ this.wrap(command.from) } ${ this.wrap(command.to) } ${ modifiers }`;
        }

        return super.compileRenameColumn(blueprint, command, connection);
    }

    protected typeUuid(column: Fluent): string
    {
        return 'uuid';
    }

    protected typeGeometry(column: Fluent): string
    {
        const subtype = column.subtype ? column.subtype.toLowerCase() : null;

        if (!['point', 'linestring', 'polygon', 'geometrycollection', 'multipoint', 'multilinestring', 'multipolygon'].includes(subtype))
        {
            subtype = null;
        }

        return `${ subtype ?? 'geometry' }${ column.srid ? ' ref_system_id=' + column.srid : '' }`;
    }
}
