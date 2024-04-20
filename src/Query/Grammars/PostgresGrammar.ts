import { Grammar } from "./Grammar";

export class PostgresGrammar extends Grammar {
    protected operators: string[] = [
        '=', '<', '>', '<=', '>=', '<>', '!=',
        'like', 'not like', 'between', 'ilike', 'not ilike',
        '~', '&', '|', '#', '<<', '>>', '<<=', '>>=',
        '&&', '@>', '<@', '?', '?|', '?&', '||', '-', '@?', '@@', '#-',
        'is distinct from', 'is not distinct from',
    ];

    protected bitwiseOperators: string[] = [
        '~', '&', '|', '#', '<<', '>>', '<<=', '>>=',
    ];

    whereBasic(query: any, where: any): string {
        if (where.operator.toLowerCase().includes('like')) {
            return `${this.wrap(where.column)}::text ${where.operator} ${this.parameter(where.value)}`;
        }

        return super.whereBasic(query, where);
    }

    whereBitwise(query: any, where: any): string {
        let value = this.parameter(where.value);
        let operator = where.operator.replace('?', '??');
        return `(${this.wrap(where.column)} ${operator} ${value})::bool`;
    }

    whereDate(query: any, where: any): string {
        let value = this.parameter(where.value);
        return `${this.wrap(where.column)}::date ${where.operator} ${value}`;
    }

    whereTime(query: any, where: any): string {
        let value = this.parameter(where.value);
        return `${this.wrap(where.column)}::time ${where.operator} ${value}`;
    }

    dateBasedWhere(type: string, query: any, where: any): string {
        let value = this.parameter(where.value);
        return `extract(${type} from ${this.wrap(where.column)}) ${where.operator} ${value}`;
    }

    whereFullText(query: any, where: any): string {
        let language = where.options.language ?? 'english';
        if (!this.validFullTextLanguages().includes(language)) {
            language = 'english';
        }

        let columns = where.columns.map((column: string) => `to_tsvector('${language}', ${this.wrap(column)})`).join(' || ');
        let mode = 'plainto_tsquery';

        if (where.options.mode === 'phrase') {
            mode = 'phraseto_tsquery';
        }

        if (where.options.mode === 'websearch') {
            mode = 'websearch_to_tsquery';
        }

        return `(${columns}) @@ ${mode}('${language}', ${this.parameter(where.value)})`;
    }

    validFullTextLanguages(): string[] {
        return [
            'simple', 'arabic', 'danish', 'dutch', 'english', 'finnish',
            'french', 'german', 'hungarian', 'indonesian', 'irish', 'italian',
            'lithuanian', 'nepali', 'norwegian', 'portuguese', 'romanian',
            'russian', 'spanish', 'swedish', 'tamil', 'turkish'
        ];
    }

    compileColumns(query: any, columns: any): string | void {
        if (query.aggregate !== null) {
            return;
        }

        let select = 'select ';
        if (Array.isArray(query.distinct)) {
            select = `select distinct on (${this.columnize(query.distinct)}) `;
        } else if (query.distinct) {
            select = 'select distinct ';
        }

        return select + this.columnize(columns);
    }

    compileJsonContains(column: string, value: string): string {
        column = column.replace('->>', '->');
        return `(${this.wrap(column)})::jsonb @> ${value}`;
    }

    compileJsonContainsKey(column: string): string {
        let segments = column.split('->');
        let lastSegment = segments.pop() as string;
        let i: string | number | undefined;

        if (!isNaN(parseInt(lastSegment))) {
            i = parseInt(lastSegment);
        } else {
            let match = lastSegment.match(/\[(-?\d+)\]$/);
            if (match) {
                segments.push(lastSegment.slice(0, match.index));
                i = parseInt(match[1]);
            }
        }

        column = segments.join('->').replace('->>', '->');
        column = this.wrap(column);

        if (i !== undefined) {
            return `case when jsonb_typeof((${column})::jsonb) = 'array' then jsonb_array_length((${column})::jsonb) >= ${i < 0 ? Math.abs(i) : i + 1} else false end`;
        }

        let key = `'${lastSegment.replace("'", "''")}'`;
        return `coalesce((${column})::jsonb ?? ${key}, false)`;
    }

    compileJsonLength(column: string, operator: string, value: string): string {
        column = column.replace('->>', '->');
        return `jsonb_array_length((${this.wrap(column)})::jsonb) ${operator} ${value}`;
    }

    compileHaving(having: any): string {
        if (having.type === 'Bitwise') {
            return this.compileHavingBitwise(having);
        }

        return super.compileHaving(having);
    }

    compileHavingBitwise(having: any): string {
        let column = this.wrap(having.column);
        let parameter = this.parameter(having.value);
        return `(${column} ${having.operator} ${parameter})::bool`;
    }

    compileLock(query: any, value: boolean | string): string {
        if (typeof value === 'boolean') {
            return value ? 'for update' : 'for share';
        }

        return value;
    }

    compileInsertOrIgnore(query: any, values: any[]): string {
        return `${this.compileInsert(query, values)} on conflict do nothing`;
    }

    compileInsertOrIgnoreUsing(query: any, columns: any[], sql: string): string {
        return `${this.compileInsertUsing(query, columns, sql)} on conflict do nothing`;
    }

    compileInsertGetId(query: any, values: any[], sequence: string): string {
        return `${this.compileInsert(query, values)} returning ${this.wrap(sequence || 'id')}`;
    }

    compileUpdate(query: any, values: any[]): string {
        if (query.joins || query.limit) {
            return this.compileUpdateWithJoinsOrLimit(query, values);
        }

        return super.compileUpdate(query, values);
    }

    compileUpdateColumns(query: any, values: any[]): string {
        return Array.from(values).map(([key, value]) => {
            if (this.isJsonSelector(key)) {
                return this.compileJsonUpdateColumn(key, value);
            }

            return `${this.wrap(key)} = ${this.parameter(value)}`;
        }).join(', ');
    }

    compileUpsert(query: any, values: any[], uniqueBy: any[], update: any[]): string {
        let sql = this.compileInsert(query, values);
        sql += ` on conflict (${this.columnize(uniqueBy)}) do update set `;

        const columns = Array.from(update).map(([key, value]) => {
            return isNumeric(key)
                ? `${this.wrap(value)} = excluded.${this.wrap(value)}`
                : `${this.wrap(key)} = ${this.parameter(value)}`;
        }).join(', ');

        return sql + columns;
    }

    compileJoinLateral(join: JoinLateralClause, expression: string): string {
        return `${join.type} join lateral ${expression} on true`;
    }

    compileJsonUpdateColumn(key: string, value: any): string {
        const segments = key.split('->');
        const field = this.wrap(segments.shift() as string);
        const path = `{${segments.map(segment => `"${segment}"`).join(',')}}`;

        return `${field} = jsonb_set(${field}::jsonb, '${path}', ${this.parameter(value)})`;
    }

    compileUpdateFrom(query: any, values: any[]): string {
        const table = this.wrapTable(query.from);
        const columns = this.compileUpdateColumns(query, values);
        let from = '';

        if (query.joins) {
            const froms = query.joins.map((join: any) => this.wrapTable(join.table));
            from = ` from ${froms.join(', ')}`;
        }

        const where = this.compileUpdateWheres(query);

        return `update ${table} set ${columns}${from} ${where}`;
    }

    compileUpdateWheres(query: any): string {
        const baseWheres = this.compileWheres(query);

        if (!query.joins) {
            return baseWheres;
        }

        const joinWheres = this.compileUpdateJoinWheres(query);

        if (baseWheres.trim() === '') {
            return `where ${this.removeLeadingBoolean(joinWheres)}`;
        }

        return `${baseWheres} ${joinWheres}`;
    }

    compileUpdateJoinWheres(query: any): string {
        const joinWheres = [];

        for (const join of query.joins) {
            for (const where of join.wheres) {
                const method = `where${where.type}`;
                joinWheres.push(`${where.boolean} ${this[method](query, where)}`);
            }
        }

        return joinWheres.join(' ');
    }

    prepareBindingsForUpdateFrom(bindings: any, values: any[]): any[] {
        const processedValues = values.map((value, column) => 
            Array.isArray(value) || (this.isJsonSelector(column) && !this.isExpression(value))
            ? JSON.stringify(value) : value
        );

        const bindingsWithoutWhere = Object.keys(bindings).filter(key => key !== 'select' && key !== 'where').reduce((acc, key) => {
            acc.push(...bindings[key]);
            return acc;
        }, []);

        return [...processedValues, ...bindings.where, ...bindingsWithoutWhere];
    }

    compileUpdateWithJoinsOrLimit(query: any, values: any[]): string {
        const table = this.wrapTable(query.from);
        const columns = this.compileUpdateColumns(query, values);
        const alias = query.from.split(/\s+as\s+/i).pop();

        const selectSql = this.compileSelect(query.select(`${alias}.ctid`));

        return `update ${table} set ${columns} where ${this.wrap('ctid')} in (${selectSql})`;
    }

    prepareBindingsForUpdate(bindings: any, values: any[]): any[] {
        const processedValues = values.map((value, column) => 
            Array.isArray(value) || (this.isJsonSelector(column) && !this.isExpression(value))
            ? JSON.stringify(value) : value
        );

        const cleanBindings = Object.keys(bindings).filter(key => key !== 'select').reduce((acc, key) => {
            acc.push(...bindings[key]);
            return acc;
        }, []);

        return [...processedValues, ...cleanBindings];
    }

    compileDelete(query: any): string {
        if (query.joins || query.limit) {
            return this.compileDeleteWithJoinsOrLimit(query);
        }

        return super.compileDelete(query);
    }

    compileDeleteWithJoinsOrLimit(query: any): string {
        // For example, if deletions require special handling with joins/limits:
        // Generate SQL for delete with necessary conditions (joins/limits) here.
        const baseSql = super.compileDelete(query);
        // You could potentially use joins/limit info to modify the base SQL.
        return baseSql; // Simplified for this example.
    }

    compileDeleteWithJoinsOrLimit(query: any): string {
        const table = this.wrapTable(query.from);
        const alias = query.from.split(/\s+as\s+/i).pop();
        const selectSql = this.compileSelect(query.select(`${alias}.ctid`));

        return `delete from ${table} where ${this.wrap('ctid')} in (${selectSql})`;
    }

    compileTruncate(query: any): {[key: string]: any[]} {
        return {[`truncate ${this.wrapTable(query.from)} restart identity cascade`]: []};
    }

    wrapJsonSelector(value: string): string {
        const path = value.split('->');
        const fieldParts = path.shift().split('.');
        const field = this.wrapSegments(fieldParts);
        const wrappedPath = this.wrapJsonPathAttributes(path);
        const attribute = wrappedPath.pop();

        return `${field}->${wrappedPath.join('->')}->>${attribute}`;
    }

    wrapJsonBooleanSelector(value: string): string {
        const selector = this.wrapJsonSelector(value.replace('->>', '->'));

        return `(${selector})::jsonb`;
    }

    wrapJsonBooleanValue(value: string): string {
        return `'${value}'::jsonb`;
    }

    wrapJsonPathAttributes(path: string[]): string[] {
        const quote = arguments.length === 2 ? arguments[1] : "'";
        
        return path.map(attribute => {
            const parsedAttributes = this.parseJsonPathArrayKeys(attribute);
            return parsedAttributes.map(attr => 
                Number.isInteger(+attr) ? attr : `${quote}${attr}${quote}`
            );
        }).flat();
    }

    parseJsonPathArrayKeys(attribute: string): string[] {
        const match = attribute.match(/(\[[^\]]+\])+$/);
        if (match) {
            const key = attribute.slice(0, -match[0].length);
            const keys = Array.from(match[0].matchAll(/\[([^\]]+)\]/g), m => m[1]);
            return [key, ...keys].filter(k => k !== '');
        }
        return [attribute];
    }

    substituteBindingsIntoRawSql(sql: string, bindings: any[]): string {
        let query = super.substituteBindingsIntoRawSql(sql, bindings);

        for (const operator of this.operators) {
            if (operator.includes('?')) {
                query = query.replace(new RegExp(operator.replace('?', '??'), 'g'), operator);
            }
        }

        return query;
    }
}