import {Grammar as BaseGrammar } from 'src/Illuminate/Grammar'
import { JoinClause } from '../JoinClause';
export abstract class Grammar extends BaseGrammar {
    protected operators: string[] = [];
    protected bitwiseOperators: string[] = [];
    protected selectComponents: string[] = [
        'aggregate',
        'columns',
        'from',
        'indexHint',
        'joins',
        'wheres',
        'groups',
        'havings',
        'orders',
        'limit',
        'offset',
        'lock',
    ];

    compileUpdateFrom: Function | null = null;
    prepareBindingsForUpdateFrom: Function | null = null;

    compileComponents(query: any): any {
        return this.selectComponents.reduce((sql, component) => {
            if (query[component] !== undefined) {
                const method = `compile${component.charAt(0).toUpperCase() + component.slice(1)}`;
                if (typeof this[method] === 'function') {
                    sql[component] = this[method](query, query[component]);
                }
            }
            return sql;
        }, {});
    }

    compileAggregate(query: any, aggregate: any): string {
        let column = this.columnize(aggregate.columns);
        if (Array.isArray(query.distinct)) {
            column = `distinct ${this.columnize(query.distinct)}`;
        } else if (query.distinct && column !== '*') {
            column = `distinct ${column}`;
        }

        return `select ${aggregate.function}(${column}) as aggregate`;
    }

    compileSelect(query: any): string {
        if ((query.unions || query.havings) && query.aggregate) {
            return this.compileUnionAggregate(query);
        }

        if (query.groupLimit) {
            query.columns = query.columns || ['*'];
            return this.compileGroupLimit(query);
        }

        const original = query.columns;
        query.columns = query.columns || ['*'];
        
        const sql = this.concatenate(this.compileComponents(query));

        if (query.unions) {
            const unionSql = this.compileUnions(query);
            return `${this.wrapUnion(sql)} ${unionSql}`;
        }

        query.columns = original;
        return sql;
    }

    compileColumns(query: any, columns: string[]): string {
        if (query.aggregate) return '';

        const prefix = query.distinct ? 'select distinct ' : 'select ';
        return prefix + this.columnize(columns);
    }

    compileFrom(query: any, table: string): string {
        return `from ${this.wrapTable(table)}`;
    }

    compileJoins(query: any, joins: any[]): string {
        return joins.map(join => {
            const table = this.wrapTable(join.table);
            const on = this.compileWheres(join);
            return `${join.type} join ${table} on ${on}`;
        }).join(' ');
    }

    compileWhereBasic(query: any, where: any): string {
        const value = this.parameter(where.value);
        return `${this.wrap(where.column)} ${where.operator} ${value}`;
    }

    // Additional compilation methods for different query parts...

    // Helper methods
    columnize(columns: string[]): string {
        return columns.map(column => this.wrap(column)).join(', ');
    }

    removeLeadingBoolean(expression: string): string {
        return expression.replace(/^\s*and\s*/i, '').replace(/^\s*or\s*/i, '');
    }

    whereIn(query: any, where: any): string {
        if (where.values && where.values.length > 0) {
            return `${this.wrap(where.column)} in (${this.parameterize(where.values)})`;
        }
        return '0 = 1';
    }

    whereNotIn(query: any, where: any): string {
        if (where.values && where.values.length > 0) {
            return `${this.wrap(where.column)} not in (${this.parameterize(where.values)})`;
        }
        return '1 = 1';
    }

    whereNotInRaw(query: any, where: any): string {
        if (where.values && where.values.length > 0) {
            return `${this.wrap(where.column)} not in (${where.values.join(', ')})`;
        }
        return '1 = 1';
    }

    whereInRaw(query: any, where: any): string {
        if (where.values && where.values.length > 0) {
            return `${this.wrap(where.column)} in (${where.values.join(', ')})`;
        }
        return '0 = 1';
    }

    whereNull(query: any, where: any): string {
        return `${this.wrap(where.column)} is null`;
    }

    whereNotNull(query: any, where: any): string {
        return `${this.wrap(where.column)} is not null`;
    }

    whereBetween(query: any, where: any): string {
        const between = where.not ? 'not between' : 'between';
        const min = this.parameter(where.values[0]);
        const max = this.parameter(where.values[1]);
        return `${this.wrap(where.column)} ${between} ${min} and ${max}`;
    }

    whereBetweenColumns(query: any, where: any): string {
        const between = where.not ? 'not between' : 'between';
        const min = this.wrap(where.values[0]);
        const max = this.wrap(where.values[1]);
        return `${this.wrap(where.column)} ${between} ${min} and ${max}`;
    }

    whereDate(query: any, where: any): string {
        return this.dateBasedWhere('date', query, where);
    }

    whereTime(query: any, where: any): string {
        return this.dateBasedWhere('time', query, where);
    }

    // Helper method to parameterize an array of values for SQL
    parameterize(values: any[]): string {
        return values.map(value => this.parameter(value)).join(', ');
    }

    whereDay(query: any, where: any): string {
        return this.dateBasedWhere('day', query, where);
    }

    whereMonth(query: any, where: any): string {
        return this.dateBasedWhere('month', query, where);
    }

    whereYear(query: any, where: any): string {
        return this.dateBasedWhere('year', query, where);
    }

    dateBasedWhere(type: string, query: any, where: any): string {
        const value = this.parameter(where.value);
        return `${type}(${this.wrap(where.column)}) ${where.operator} ${value}`;
    }

    whereColumn(query: any, where: any): string {
        return `${this.wrap(where.first)} ${where.operator} ${this.wrap(where.second)}`;
    }

    whereNested(query: any, where: any): string {
        // Here we will calculate what portion of the string we need to remove. If this
        // is a join clause query, we need to remove the "on" portion of the SQL and
        // if it is a normal query we need to take the leading "where" of queries.
        const offset = where.query instanceof JoinClause ? 3 : 6;
        return `(${this.compileWheres(where.query).substring(offset)})`;
    }

    whereSub(query: any, where: any): string {
        const select = this.compileSelect(where.query);
        return `${this.wrap(where.column)} ${where.operator} (${select})`;
    }

    whereExists(query: any, where: any): string {
        return `exists (${this.compileSelect(where.query)})`;
    }

    whereNotExists(query: any, where: any): string {
        return `not exists (${this.compileSelect(where.query)})`;
    }

    whereRowValues(query: any, where: any): string {
        const columns = this.columnize(where.columns);
        const values = this.parameterize(where.values);
        return `(${columns}) ${where.operator} (${values})`;
    }

    whereJsonBoolean(query: any, where: any): string {
        const column = this.wrapJsonBooleanSelector(where.column);
        const value = this.wrapJsonBooleanValue(this.parameter(where.value));
        return `${column} ${where.operator} ${value}`;
    }

    whereJsonContains(query: any, where: any): string {
        const not = where.not ? 'not ' : '';
        return `${not}${this.compileJsonContains(where.column, this.parameter(where.value))}`;
    }

    compileJsonContains(column: string, value: string): string {
        throw new Error('This database engine does not support JSON contains operations.');
    }

    prepareBindingForJsonContains(binding: any): string {
        return JSON.stringify(binding);
    }

    whereJsonContainsKey(query: any, where: any): string {
        const not = where.not ? 'not ' : '';
        return `${not}${this.compileJsonContainsKey(where.column)}`;
    }

    compileJsonContainsKey(column: string): string {
        throw new Error('This database engine does not support JSON contains key operations.');
    }

    whereJsonLength(query: any, where: any): string {
        return this.compileJsonLength(where.column, where.operator, this.parameter(where.value));
    }

    compileJsonLength(column: string, operator: string, value: string): string {
        throw new Error('This database engine does not support JSON length operations.');
    }

    compileJsonValueCast(value: string): string {
        return value;
    }

    whereFullText(query: any, where: any): string {
        throw new Error('This database engine does not support fulltext search operations.');
    }

    whereExpression(query: any, where: any): string {
        return where.column.getValue(this);
    }

    compileGroups(query: any, groups: any[]): string {
        return `group by ${this.columnize(groups)}`;
    }

    compileHavings(query: any): string {
        const havings = query.havings.map((having: any) => `${having.boolean} ${this.compileHaving(having)}`).join(' ');
        return `having ${this.removeLeadingBoolean(havings)}`;
    }

    compileHaving(having: any): string {
        switch (having.type) {
            case 'Raw':
                return having.sql;
            case 'between':
                return this.compileHavingBetween(having);
            case 'Null':
                return this.compileHavingNull(having);
            case 'NotNull':
                return this.compileHavingNotNull(having);
            case 'bit':
                return this.compileHavingBit(having);
            case 'Expression':
                return this.compileHavingExpression(having);
            case 'Nested':
                return this.compileNestedHavings(having);
            default:
                return this.compileBasicHaving(having);
        }
    }

    compileBasicHaving(having: any): string {
        const column = this.wrap(having.column);
        const parameter = this.parameter(having.value);
        return `${column} ${having.operator} ${parameter}`;
    }

    compileHavingBetween(having: any): string {
        const between = having.not ? 'not between' : 'between';
        const column = this.wrap(having.column);
        const min = this.parameter(having.values[0]);
        const max = this.parameter(having.values[1]);
        return `${column} ${between} ${min} and ${max}`;
    }

    compileHavingNull(having: any): string {
        const column = this.wrap(having.column);
        return `${column} is null`;
    }

    compileHavingNotNull(having: any): string {
        const column = this.wrap(having.column);
        return `${column} is not null`;
    }

    compileHavingBit(having: any): string {
        const column = this.wrap(having.column);
        const parameter = this.parameter(having.value);
        return `(${column} ${having.operator} ${parameter}) != 0`;
    }

    compileHavingExpression(having: any): string {
        return having.column.getValue(this);
    }

    compileNestedHavings(having: any): string {
        const innerSql = this.compileHavings(having.query);
        return `(${innerSql.substring(7)})`;  // Remove the leading "having " part.
    }

    compileOrders(query: any, orders: any[]): string {
        if (orders && orders.length > 0) {
            return `order by ${this.compileOrdersToArray(query, orders).join(', ')}`;
        }
        return '';
    }

    compileOrdersToArray(query: any, orders: any[]): string[] {
        return orders.map((order: any) => {
            if (order.sql) {
                return order.sql;
            } else {
                const column = this.wrap(order.column);
                const direction = order.direction;
                return `${column} ${direction}`;
            }
        });
    }

    compileRandom(seed?: string | number): string {
        return 'RANDOM()';  // Adjust based on actual SQL function for randomness if needed.
    }

    compileLimit(query: any, limit: number): string {
        return `limit ${parseInt(limit.toString(), 10)}`;
    }

    parameter(value: any): string {
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`; // Properly escape strings
        } else if (value === null) {
            return 'NULL';
        } else {
            return value.toString();
        }
    }

    compileGroupLimit(query: any): string {
        const selectBindings = [...query.getRawBindings()['select'], ...query.getRawBindings()['order']];
        query.setBindings(selectBindings, 'select');
        query.setBindings([], 'order');

        let limit = parseInt(query.groupLimit['value']);
        let offset = query.offset;

        if (offset !== undefined) {
            offset = parseInt(offset);
            limit += offset;
            query.offset = null;
        }

        const components = this.compileComponents(query);
        components['columns'] += this.compileRowNumber(
            query.groupLimit['column'],
            components['orders'] ?? ''
        );

        delete components['orders'];

        const table = this.wrap('laravel_table');
        const row = this.wrap('laravel_row');

        let sql = this.concatenate(components);
        sql = `select * from (${sql}) as ${table} where ${row} <= ${limit}`;

        if (offset !== undefined) {
            sql += ` and ${row} > ${offset}`;
        }

        return `${sql} order by ${row}`;
    }

    compileRowNumber(partition: string, orders: string): string {
        const over = `partition by ${this.wrap(partition)} ${orders}`;
        return `, row_number() over (${over.trim()}) as ${this.wrap('laravel_row')}`;
    }

    compileOffset(query: any, offset: number): string {
        return `offset ${parseInt(offset.toString(), 10)}`;
    }

    compileUnions(query: any): string {
        let sql = '';

        for (const union of query.unions) {
            sql += this.compileUnion(union);
        }

        if (query.unionOrders) {
            sql += ` ${this.compileOrders(query, query.unionOrders)}`;
        }

        if (query.unionLimit) {
            sql += ` ${this.compileLimit(query, query.unionLimit)}`;
        }

        if (query.unionOffset) {
            sql += ` ${this.compileOffset(query, query.unionOffset)}`;
        }

        return sql.trim();
    }

    compileUnion(union: any): string {
        const conjunction = union.all ? ' union all ' : ' union ';
        return conjunction + this.wrapUnion(union.query.toSql());
    }

    wrapUnion(sql: string): string {
        return `(${sql})`;
    }

    compileUnionAggregate(query: any): string {
        const sql = this.compileAggregate(query, query.aggregate);
        query.aggregate = null;
        return `${sql} from (${this.compileSelect(query)}) as ${this.wrapTable('temp_table')}`;
    }

    compileExists(query: any): string {
        const select = this.compileSelect(query);
        return `select exists(${select}) as ${this.wrap('exists')}`;
    }

    compileInsert(query: any, values: any[]): string {
        const table = this.wrapTable(query.from);

        if (!values.length) {
            return `insert into ${table} default values`;
        }

        if (!Array.isArray(values[0])) {
            values = [values];
        }

        const columns = this.columnize(Object.keys(values[0]));
        const parameters = values.map(record => `(${this.parameterize(record)})`).join(', ');

        return `insert into ${table} (${columns}) values ${parameters}`;
    }

    compileInsertOrIgnore(query: any, values: any[]): string {
        throw new Error('This database engine does not support inserting while ignoring errors.');
    }

    compileInsertGetId(query: any, values: any, sequence?: string): string {
        return this.compileInsert(query, values);
    }

    compileInsertUsing(query: any, columns: string[], sql: string): string {
        const table = this.wrapTable(query.from);
        const columnPart = columns.length && columns[0] !== '*' ? `(${this.columnize(columns)})` : '';
        return `insert into ${table} ${columnPart} ${sql}`;
    }

    compileInsertOrIgnoreUsing(query: any, columns: string[], sql: string): string {
        throw new Error('This database engine does not support inserting while ignoring errors.');
    }

    compileUpdate(query: any, values: any): string {
        const table = this.wrapTable(query.from);
        const columns = this.compileUpdateColumns(query, values);
        const where = this.compileWheres(query);

        if (query.joins) {
            return this.compileUpdateWithJoins(query, table, columns, where);
        }

        return `update ${table} set ${columns} ${where}`;
    }

    compileUpdateColumns(query: any, values: any): string {
        return Object.entries(values).map(([key, value]) => `${this.wrap(key)} = ${this.parameter(value)}`).join(', ');
    }

    compileUpdateWithJoins(query: any, table: string, columns: string, where: string): string {
        const joins = this.compileJoins(query, query.joins);
        return `update ${table} ${joins} set ${columns} ${where}`;
    }

    compileUpdateWithoutJoins(query: any, table: string, columns: string, where: string): string {
        return `update ${table} set ${columns} ${where}`;
    }

    compileUpsert(query: any, values: any[], uniqueBy: string[], update: any[] | Record<string, any>): string {
        throw new Error('This database engine does not support upserts.');
    }

    prepareBindingsForUpdate(bindings: any, values: any): any[] {
        const cleanBindings = this.arrExcept(bindings, ['select', 'join']);
        const flatValues = this.arrFlatten(Object.values(values).map(value => this.resolveValue(value)));
        return [...bindings['join'], ...flatValues, ...this.arrFlatten(Object.values(cleanBindings))];
    }

    resolveValue(value: any): any {
        // This is a placeholder; actual implementation may involve resolving promises or similar operations
        return typeof value === 'function' ? value() : value;
    }

    compileDelete(query: any): string {
        const table = this.wrapTable(query.from);
        const where = this.compileWheres(query);

        if (query.joins) {
            return this.compileDeleteWithJoins(query, table, where);
        } else {
            return this.compileDeleteWithoutJoins(query, table, where);
        }
    }

    compileDeleteWithoutJoins(query: any, table: string, where: string): string {
        return `delete from ${table} ${where}`;
    }

    compileDeleteWithJoins(query: any, table: string, where: string): string {
        const alias = table.split(' as ').pop();
        const joins = this.compileJoins(query, query.joins);
        return `delete ${alias} from ${table} ${joins} ${where}`;
    }

    prepareBindingsForDelete(bindings: any): any[] {
        return this.arrFlatten(this.arrExcept(bindings, ['select']));
    }

    compileTruncate(query: any): any {
        return { [`truncate table ${this.wrapTable(query.from)}`]: [] };
    }

    compileLock(query: any, value: boolean | string): string {
        if (typeof value === 'string') {
            return value;
        }
        return '';
    }

    supportsSavepoints(): boolean {
        return true;
    }

    compileSavepoint(name: string): string {
        return `SAVEPOINT ${name}`;
    }

    compileSavepointRollBack(name: string): string {
        return `ROLLBACK TO SAVEPOINT ${name}`;
    }

    wrapJsonBooleanSelector(value: string): string {
        return this.wrapJsonSelector(value);
    }

    wrapJsonBooleanValue(value: string): string {
        return value; // Needs specific implementation based on the DB's JSON handling
    }

    concatenate(segments: string[]): string {
        return segments.filter(value => value !== '').join(' ');
    }

    // Additional helper methods to support the primary methods above
    wrapTable(name: string): string {
        return `"${name}"`;
    }

    compileWheres(query: any): string {
        if (!query.wheres.length) {
            return '';
        }
        const compiledWheres = query.wheres.map((where: any) => this.compileWhere(query, where)).join(' ');
        return `where ${this.removeLeadingBoolean(compiledWheres)}`;
    }

    compileWhere(query: any, where: any): string {
        // Placeholder for where compilation logic
        return ''; // Actual implementation needed based on 'where' type
    }

    arrFlatten(array: any[]): any[] {
        return array.reduce((acc, val) => acc.concat(val), []);
    }

    arrExcept(object: any, keys: string[]): any {
        const result: any = {};
        for (let key in object) {
            if (keys.indexOf(key) === -1) {
                result[key] = object[key];
            }
        }
        return result;
    }

    substituteBindingsIntoRawSql(sql: string, bindings: any[]): string {
        const escapedBindings = bindings.map(value => this.escape(value));
        let query = '';
        let isStringLiteral = false;

        for (let i = 0; i < sql.length; i++) {
            const char = sql[i];
            const nextChar = sql[i + 1] ?? null;

            // Handle SQL standard escapes for single quotes and specific database behaviors.
            if (['\'', "''", '??'].includes(char + nextChar)) {
                query += char + nextChar;
                i++;  // Skip the next character as it's part of the escape sequence
            } else if (char === '\'') {  // Toggle string literal status
                query += char;
                isStringLiteral = !isStringLiteral;
            } else if (char === '?' && !isStringLiteral) {  // Replace placeholder with binding
                query += escapedBindings.shift() ?? '?';
            } else {  // Regular characters just append
                query += char;
            }
        }

        return query;
    }

    escape(value: any): string {
        // This is a very basic implementation, specific handling for SQL injection prevention
        // and proper escaping based on the database backend might be needed.
        if (typeof value === 'string') {
            // Escape single quotes in SQL standard way
            return `'${value.replace(/'/g, "''")}'`;
        } else if (value === null) {
            return 'NULL';
        } else if (typeof value === 'boolean') {
            return value ? '1' : '0';  // Convert boolean to integer
        } else {
            return value.toString();
        }
    }

    getOperators(): string[] {
        return this.operators;
    }

    getBitwiseOperators(): string[] {
        return this.bitwiseOperators;
    }

    abstract wrapJsonSelector(json_selector:any):any;
}