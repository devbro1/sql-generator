import { Connection } from "../Schema/Connections/Connection";
import { Expression } from "./Expression";

export class Grammar
{
    protected connection: Connection | null = null;
    protected tablePrefix: string = '';

    wrapArray(values: any[]): any[]
    {
        return values.map(value => this.wrap(value));
    }

    wrapTable(table: Expression | string): string
    {
        if (this.isExpression(table))
        {
            return (table as Expression).getValue(this);
        }

        if (typeof table === 'string' && table.includes(' as '))
        {
            return this.wrapAliasedTable(table);
        }

        if (typeof table === 'string' && table.includes('.'))
        {
            table = table.replace('.', `.${ this.tablePrefix }`);
            return table.split('.').map(segment => this.wrapValue(segment)).join('.');
        }

        return this.wrapValue(this.tablePrefix + table);
    }

    wrap(value: Expression | string): string
    {
        if (this.isExpression(value))
        {
            return (value as Expression).getValue(this);
        }

        if (typeof value === 'string' && value.includes(' as '))
        {
            return this.wrapAliasedValue(value);
        }

        if (typeof value === 'string' && value.includes('->'))
        {
            throw new Error('This database engine does not support JSON operations.');
        }

        return this.wrapSegments(value.split('.'));
    }

    protected wrapAliasedValue(value: string): string
    {
        const segments = value.split(/\s+as\s+/i);
        return this.wrap(segments[0]) + ' as ' + this.wrapValue(segments[1]);
    }

    protected wrapAliasedTable(value: string): string
    {
        const segments = value.split(/\s+as\s+/i);
        return this.wrapTable(segments[0]) + ' as ' + this.wrapValue(this.tablePrefix + segments[1]);
    }

    protected wrapSegments(segments: string[]): string
    {
        return segments
            .map((segment, index) => (index === 0 && segments.length > 1 ? this.wrapTable(segment) : this.wrapValue(segment)))
            .join('.');
    }

    protected wrapValue(value: string): string
    {
        if (value !== '*')
        {
            return `"${ value.replace(/"/g, '""') }"`;
        }
        return value;
    }

    isExpression(value: any): value is Expression
    {
        return typeof value === 'object' && 'getValue' in value && typeof (value as Expression).getValue === 'function';
    }

    getValue(expression: Expression | string | number | boolean): any
    {
        if (this.isExpression(expression))
        {
            return this.getValue((expression as Expression).getValue(this));
        }
        return expression;
    }

    setTablePrefix(prefix: string): void
    {
        this.tablePrefix = prefix;
    }

    setConnection(connection: Connection): void
    {
        this.connection = connection;
    }

    columnize(columns: string[]): string
    {
        return columns.map(column => this.wrap(column)).join(', ');
    }

    parameterize(values: any[]): string
    {
        return values.map(value => this.parameter(value)).join(', ');
    }

    parameter(value: any): string
    {
        return this.isExpression(value) ? this.getValue(value) : '?';
    }

    quoteString(value: string | string[]): string
    {
        if (Array.isArray(value))
        {
            return value.map(item => this.quoteString(item)).join(', ');
        }
        return `'${ value }'`;
    }

    escape(value: string | number | boolean | null, binary = false): string
    {
        if (this.connection === null)
        {
            throw new Error("The database driver's grammar implementation does not support escaping values.");
        }
        return this.connection.escape(value, binary);
    }

    getDateFormat(): string
    {
        return 'Y-m-d H:i:s';
    }

    getTablePrefix(): string
    {
        return this.tablePrefix;
    }

    protected wrapJsonFieldAndPath(column: string): [string, string] {
        const parts = column.split('->', 2);
        const field = this.wrap(parts[0]);
        const path = parts.length > 1 ? ', ' + this.wrapJsonPath(parts[1], '->') : '';
        return [field, path];
    }
    
    protected wrapJsonPath(value: string, delimiter: string = '->'): string {
        value = value.replace(/([\\]+)?'/g, "''");
        const jsonPath = value.split(delimiter)
            .map(segment => this.wrapJsonPathSegment(segment))
            .join('.');
        return "'$".concat(jsonPath.startsWith('[') ? '' : '.', jsonPath, "'");
    }
    
    protected wrapJsonPathSegment(segment: string): string {
        const match = segment.match(/(\[[^\]]+\])+$/);
        if (match) {
            const key = segment.slice(0, segment.lastIndexOf(match[0]));
            return key ? `"${key}"${match[0]}` : match[0];
        }
        return `"${segment}"`;
    }

    protected isJsonSelector(value: string): boolean {
        return value.includes('->');
    }

    protected whereBasic(query: Builder, where: { column: string; operator: string; value: any }): string {
        let value = this.parameter(where.value);
        let operator = where.operator.replace('?', '??');
        return this.wrap(where.column) + ' ' + operator + ' ' + value;
    }
}