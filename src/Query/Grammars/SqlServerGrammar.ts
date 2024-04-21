import { Expression } from "src/Illuminate/Expression";
import { Grammar } from "./Grammar";
import { JoinLateralClause } from "../JoinLateralClause";

export class SqlServerGrammar extends Grammar {
    operators: string[] = [
        '=', '<', '>', '<=', '>=', '!<', '!>', '<>', '!=',
        'like', 'not like', 'ilike',
        '&', '&=', '|', '|=', '^', '^=',
    ];

    selectComponents: string[] = [
        'aggregate',
        'columns',
        'from',
        'indexHint',
        'joins',
        'wheres',
        'groups',
        'havings',
        'orders',
        'offset',
        'limit',
        'lock',
    ];

    compileSelect(query: any): string {
        if (query.offset && !query.orders.length) {
            query.orders.push({ sql: '(SELECT 0)' });
        }
        return super.compileSelect(query);
    }

    compileColumns(query: any, columns: string[]): string {
        if (query.aggregate !== null) {
            return '';
        }

        let select = query.distinct ? 'select distinct ' : 'select ';

        if (typeof query.limit === 'number' && query.limit > 0 && (query.offset || 0) <= 0) {
            select += `top ${query.limit} `;
        }

        return select + this.columnize(columns);
    }

    compileFrom(query: any, table: string): string {
        let from = super.compileFrom(query, table);

        if (typeof query.lock === 'string') {
            return from + ' ' + query.lock;
        }

        if (query.lock !== null) {
            return from + ` with(rowlock,${query.lock ? 'updlock,' : ''}holdlock)`;
        }

        return from;
    }

    compileIndexHint(query: any, indexHint: any): string {
        return indexHint.type === 'force' ? `with (index(${indexHint.index}))` : '';
    }

    whereBitwise(query: any, where: any): string {
        const value = this.parameter(where.value);
        const operator = where.operator.replace('?', '??');
        return `(${this.wrap(where.column)} ${operator} ${value}) != 0`;
    }

    whereDate(query: any, where: any): string {
        const value = this.parameter(where.value);
        return `cast(${this.wrap(where.column)} as date) ${where.operator} ${value}`;
    }

    whereTime(query: any, where: any): string {
        const value = this.parameter(where.value);
        return `cast(${this.wrap(where.column)} as time) ${where.operator} ${value}`;
    }

    compileJsonContains(column: string, value: string): string {
        const [field, path] = this.wrapJsonFieldAndPath(column);
        return `${value} in (select value from openjson(${field}${path}))`;
    }

    prepareBindingForJsonContains(binding: any): any {
        return typeof binding === 'boolean' ? JSON.stringify(binding) : binding;
    }

    compileJsonContainsKey(column: string): string {
        const [field, path] = this.wrapJsonFieldAndPath(column);
        return `json_type(${field}${path}) is not null`;
    }

    compileJsonLength(column: string, operator: string, value: string): string {
        const [field, path] = this.wrapJsonFieldAndPath(column);
        return `(select count(*) from openjson(${field}${path})) ${operator} ${value}`;
    }

    compileJsonValueCast(value: string): string {
        return `json_query(${value})`;
    }

    compileHaving(having: any): string {
        if (having.type === 'Bitwise') {
            return this.compileHavingBitwise(having);
        }

        return super.compileHaving(having);
    }

    compileHavingBitwise(having: any): string {
        const column = this.wrap(having.column);
        const parameter = this.parameter(having.value);
        return `(${column} ${having.operator} ${parameter}) != 0`;
    }

    compileDeleteWithoutJoins(query: any, table: string, where: string): string {
        let sql = super.compileDeleteWithoutJoins(query, table, where);
        if (query.limit && query.limit > 0 && query.offset <= 0) {
            sql = Str.replaceFirst('delete', `delete top (${query.limit})`, sql);
        }
        return sql;
    }

    compileRandom(seed?: number): string {
        return 'NEWID()';
    }

    compileLimit(query: any, limit: number): string {
        if (limit && query.offset > 0) {
            return `fetch next ${limit} rows only`;
        }
        return '';
    }

    compileOffset(query: any, offset: number): string {
        if (offset) {
            return `offset ${offset} rows`;
        }
        return '';
    }

    wrapUnion(sql: string): string {
        return `select * from (${sql}) as ${this.wrapTable('temp_table')}`;
    }

    compileExists(query: any): string {
        const existsQuery = { ...query, columns: [] };
        existsQuery.selectRaw('1 [exists]').limit(1);
        return this.compileSelect(existsQuery);
    }

    compileUpdateWithJoins(query: any, table: string, columns: string, where: string): string {
        const alias = table.split(' as ').pop();
        const joins = this.compileJoins(query, query.joins);
        return `update ${alias} set ${columns} from ${table} ${joins} ${where}`;
    }

    compileUpsert(query: any, values: any[], uniqueBy: string[], update: any[]): string {
        const columns = this.columnize(Object.keys(values[0]));
        let sql = `merge ${this.wrapTable(query.from)} `;

        const parameters = values.map(record => `(${this.parameterize(record)})`).join(', ');
        sql += `using (values ${parameters}) as ${this.wrapTable('laravel_source')} (${columns}) `;

        const on = uniqueBy.map(column => `${this.wrap('laravel_source.' + column)} = ${this.wrap(query.from + '.' + column)}`).join(' and ');
        sql += `on ${on} `;

        if (update) {
            const updateStatements = update.map((value, key) => typeof key === 'number' 
                ? `${this.wrap(value)} = ${this.wrap('laravel_source.' + value)}`
                : `${this.wrap(key)} = ${this.parameter(value)}`).join(', ');

            sql += `when matched then update set ${updateStatements} `;
        }

        sql += `when not matched then insert (${columns}) values (${columns});`;
        return sql;
    }

    prepareBindingsForUpdate(bindings: any, values: any[]): any[] {
        const cleanBindings = Arr.except(bindings, 'select');
        return [...values, ...Arr.flatten(cleanBindings)];
    }

    compileJoinLateral(join: JoinLateralClause, expression: string): string {
        const type = join.type === 'left' ? 'outer' : 'cross';
        return `${type} apply ${expression}`;
    }

    compileSavepoint(name: string): string {
        return `SAVE TRANSACTION ${name}`;
    }

    compileSavepointRollBack(name: string): string {
        return `ROLLBACK TRANSACTION ${name}`;
    }

    getDateFormat(): string {
        return 'Y-m-d H:i:s.v';
    }

    wrapValue(value: string): string {
        return value === '*' ? value : `[${value.replace(']', ']]')}]`;
    }

    wrapJsonSelector(value: string): string {
        const [field, path] = this.wrapJsonFieldAndPath(value);
        return `json_value(${field}${path})`;
    }

    wrapJsonBooleanValue(value: string): string {
        return `'${value}'`;
    }

    wrapTable(table: string | Expression): string {
        if (!this.isExpression(table)) {
            return this.wrapTableValuedFunction(super.wrapTable(table as string));
        }
        return this.getValue(table as Expression);
    }

    wrapTableValuedFunction(table: string): string {
        const match = /^(.+?)(\(.*?\))$/.exec(table);
        if (match) {
            table = `${match[1]}]${match[2]}`;
        }
        return table;
    }

    // Helper to determine if an object is an Expression
    isExpression(obj: any): obj is Expression {
        return obj instanceof Expression;
    }

    // Helper to retrieve the value from an Expression
    getValue(expression: Expression): string {
        return expression.value;
    }

    // Decompose a JSON path into the field and path components
    wrapJsonFieldAndPath(value: string): [string, string] {
        const path = value.split('->');
        const field = this.wrap(path.shift()!);
        const jsonPath = path.map(part => `.${part.replace("'", "''")}`).join('');
        return [field, jsonPath];
    }
}