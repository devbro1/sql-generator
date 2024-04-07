import { Connection } from '../../Illuminate/Connection';
import { Expression } from '../../Illuminate/Expression';
import { Grammar as BaseGrammar } from '../../Illuminate/Grammar';
import { Blueprint } from '../Blueprint';
import { ColumnDefinition } from '../ColumnDefinition';

export class Grammar extends BaseGrammar
{
    protected modifiers: string[] = [];
    protected transactions: boolean = false;
    protected fluentCommands: any[] = [];

    compile(method_name: keyof this,...rest: any[]) {
        if(typeof this[method_name] == 'function')
        {
            return (this[method_name] as Function)(...rest);
        }
    }

    compileCreateDatabase(name: string, connection: Connection): void
    {
        throw new Error('This database driver does not support creating databases.');
    }

    compileDropDatabaseIfExists(name: string): void
    {
        throw new Error('This database driver does not support dropping databases.');
    }

    compileRenameColumn(blueprint: Blueprint, command: any, connection: Connection): string
    {
        return `alter table ${ this.wrapTable(blueprint) } rename column ${ this.wrap(command.from) } to ${ this.wrap(command.to) }`;
    }

    compileChange(blueprint: Blueprint, command: any, connection: Connection): void
    {
        throw new Error('This database driver does not support modifying columns.');
    }

    compileFulltext(blueprint: Blueprint, command: any): void
    {
        throw new Error('This database driver does not support fulltext index creation.');
    }

    compileDropFullText(blueprint: Blueprint, command: any): void
    {
        throw new Error('This database driver does not support fulltext index removal.');
    }

    compileForeign(blueprint: Blueprint, command: any): string
    {
        let sql = `alter table ${ this.wrapTable(blueprint) } add constraint ${ this.wrap(command.index) }`;
        sql += ` foreign key (${ this.columnize(command.columns) }) references ${ this.wrapTable(command.on) } (${ this.columnize(command.references) })`;

        if (command.onDelete !== null)
        {
            sql += ` on delete ${ command.onDelete }`;
        }

        if (command.onUpdate !== null)
        {
            sql += ` on update ${ command.onUpdate }`;
        }

        return sql;
    }

    compileDropForeign(blueprint: Blueprint, command: any): void
    {
        throw new Error('This database driver does not support dropping foreign keys.');
    }

    protected getColumns(blueprint: Blueprint): string[]
    {
        const columns: string[] = [];

        for (const column of blueprint.getAddedColumns())
        {
            let sql = `${ this.wrap(column) } ${ this.getType(column) }`;
            sql = this.addModifiers(sql, blueprint, column);
            columns.push(sql);
        }

        return columns;
    }

    // converts a Blueprint type to db specific type
    protected getType(column: ColumnDefinition): string
    {
        const method_name = `type${ column.properties.type.charAt(0).toUpperCase() + column.properties.type.slice(1) }` as keyof typeof this;

        if(typeof this[method_name] == 'function')
        {
            return (this[method_name] as Function)(column);
        }
        return '';
    }

    protected typeComputed(column: any): void
    {
        throw new Error('This database driver does not support the computed type.');
    }

    protected addModifiers(sql: string, blueprint: Blueprint, column: any): string
    {
        for (const modifier of this.modifiers)
        {
            const method = `modify${ modifier }` as keyof typeof this;
            if (typeof this[method] === 'function')
            {
                sql += (this[method] as Function)(blueprint, column) ?? '';
            }
        }

        return sql;
    }

    protected getCommandByName(blueprint: Blueprint, name: string): any | null
    {
        const commands = this.getCommandsByName(blueprint, name);
        return commands.length > 0 ? commands[0] : null;
    }

    protected getCommandsByName(blueprint: Blueprint, name: string): any[]
    {
        return blueprint.getCommands().filter(command => command.name === name);
    }

    protected hasCommand(blueprint: Blueprint, name: string): boolean
    {
        return blueprint.getCommands().some(command => command.name === name);
    }

    prefixArray(prefix: string, values: string[]): string[]
    {
        return values.map(value => `${ prefix } ${ value }`);
    }

    wrapTable(table: Blueprint | string | Expression): string
    {
        if(typeof table === 'string') {
            return super.wrapTable(table);
        }
        else if(typeof table === 'object' && table instanceof Blueprint){
            return super.wrapTable(table.getTable());
        }
        else if(table instanceof Expression) {
            return super.wrapTable(table.getValue());
        }
        return '';
    }

    
    wrap(value: ColumnDefinition | string | Expression, prefixAlias: boolean = false): string
    {
        if(value instanceof ColumnDefinition)
        {
            return super.wrap(value.properties.name);            
        }
        else if(typeof value === 'string')
        {
            return super.wrap(value);
        }

        return '';
    }

    getDefaultValue(value: any): string
    {
        if (value instanceof Expression)
        {
            return this.getValue(value);
        }

        return typeof value === 'boolean' ? (value ? '1' : '0') : `'${ value }'`;
    }

    getFluentCommands(): any[]
    {
        return this.fluentCommands;
    }

    supportsSchemaTransactions(): boolean
    {
        return this.transactions;
    }


    protected wrapJsonFieldAndPath(column: string): [string, string] {
        const parts = column.split('->', 2);
        const field = this.wrap(parts[0]);
        const path = parts.length > 1 ? `, ${this.wrapJsonPath(parts[1], '->')}` : '';
        return [field, path];
    }

    protected wrapJsonPath(value: string, delimiter: string = '->'): string {
        value = value.replace(/(\\+)?\'/g, "''");
    
        const jsonPath = value.split(delimiter)
                              .map(segment => this.wrapJsonPathSegment(segment))
                              .join('.');
    
        return `'$${jsonPath.startsWith('[') ? '' : '.'}${jsonPath}'`;
    }

    protected wrapJsonPathSegment(segment: string): string {
        const parts = segment.match(/(\[[^\]]+\])+$/);
    
        if (parts) {
            const key = segment.substring(0, segment.lastIndexOf(parts[0]));
    
            if (key !== '') {
                return `"${key}"${parts[0]}`;
            }
    
            return parts[0];
        }
    
        return `"${segment}"`;
    }
    
}
