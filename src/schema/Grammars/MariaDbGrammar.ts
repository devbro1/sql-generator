import { MySqlGrammar } from "./MySqlGrammar";
import { Blueprint } from "../Blueprint";
import { Connection } from "../../Illuminate/Connection";
import { Expression } from "../../Illuminate/Expression";
import { ColumnDefinition } from "../ColumnDefinition";

export class MariaDbGrammar extends MySqlGrammar
{

    public compileRenameColumn(blueprint: Blueprint, command: any, connection: Connection): string
    {
        if (connection.getServerVersion().localeCompare('10.5.2', '<'))
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
            }));

            return `alter table ${ this.wrapTable(blueprint) } change ${ this.wrap(command.from) } ${ this.wrap(command.to) } ${ modifiers }`;
        }

        return super.compileRenameColumn(blueprint, command, connection);
    }

    protected typeUuid(column: any): string
    {
        return 'uuid';
    }

    protected typeGeometry(column: ColumnDefinition): string
    {
        let subtype = column.properties.subtype ? column.properties.subtype.toLowerCase() : '';

        if (!['point', 'linestring', 'polygon', 'geometrycollection', 'multipoint', 'multilinestring', 'multipolygon'].includes(subtype))
        {
            subtype = '';
        }

        return `${ subtype || 'geometry' }${ column.properties.srid ? ' ref_system_id=' + column.properties.srid : '' }`;
    }
}
