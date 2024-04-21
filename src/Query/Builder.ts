import { Expression } from "src/Illuminate/Expression";

export class Builder
{
    public connection: any;
    public grammar: Grammar;
    public processor: Processor;
    public bindings = {
        select: [],
        from: [],
        join: [],
        where: [],
        groupBy: [],
        having: [],
        order: [],
        union: [],
        unionOrder: []
    };
    public aggregate: any;
    public columns: any[] | null;
    public distinct: boolean | any[] = false;
    public from: Expression | string;
    public indexHint: IndexHint;
    public joins: any[];
    public wheres: any[] = [];
    public groups: any[];
    public havings: any[];
    public orders: any[];
    public limit: number;
    public groupLimit: any;
    public offset: number;
    public unions: any[];
    public unionLimit: number;
    public unionOffset: number;
    public unionOrders: any[];
    public lock: string | boolean;
    public beforeQueryCallbacks: any[] = [];
    protected afterQueryCallbacks: any[] = [];
    public operators = [
        '=', '<', '>', '<=', '>=', '<>', '!=', '<=>',
        'like', 'like binary', 'not like', 'ilike',
        '&', '|', '^', '<<', '>>', '&~', 'is', 'is not',
        'rlike', 'not rlike', 'regexp', 'not regexp',
        '~', '~*', '!~', '!~*', 'similar to',
        'not similar to', 'not ilike', '~~*', '!~~*',
    ];
    public bitwiseOperators = [
        '&', '|', '^', '<<', '>>', '&~'
    ];
    public useWritePdo = false;



    public connection: ConnectionInterface;
    public grammar: Grammar | null = null;
    public processor: Processor | null = null;
    public bindings = {
        select: [],
        from: [],
        join: [],
        where: [],
        groupBy: [],
        having: [],
        order: [],
        union: [],
        unionOrder: []
    };
    public aggregate: any;
    public columns: any[] | null = null;
    public distinct: boolean | any[] = false;
    public from: Expression | string;
    public indexHint: IndexHint;
    public joins: any[] = [];
    public wheres: any[] = [];
    public groups: any[];
    public havings: any[];
    public orders: any[];
    public limit: number;
    public groupLimit: any;
    public offset: number;
    public unions: any[];
    public unionLimit: number;
    public unionOffset: number;
    public unionOrders: any[];
    public lock: string | boolean;
    public beforeQueryCallbacks: any[] = [];
    public afterQueryCallbacks: any[] = [];
    public operators: string[] = [
        '=', '<', '>', '<=', '>=', '<>', '!=', '<=>',
        'like', 'like binary', 'not like', 'ilike',
        '&', '|', '^', '<<', '>>', '&~', 'is', 'is not',
        'rlike', 'not rlike', 'regexp', 'not regexp',
        '~', '~*', '!~', '!~*', 'similar to',
        'not similar to', 'not ilike', '~~*', '!~~*',
    ];
    public bitwiseOperators: string[] = [
        '&', '|', '^', '<<', '>>', '&~',
    ];
    public useWritePdo: boolean = false;

    constructor(connection: ConnectionInterface, grammar?: Grammar, processor?: Processor)
    {
        this.connection = connection;
        this.grammar = grammar ?? connection.getQueryGrammar();
        this.processor = processor ?? connection.getPostProcessor();
    }

    select(columns: any[] | any = ['*']): this
    {
        this.columns = [];
        this.bindings['select'] = [];

        if (!Array.isArray(columns))
        {
            columns = Array.from(arguments);
        }

        columns.forEach((column, as) =>
        {
            if (typeof as === 'string' && this.isQueryable(column))
            {
                this.selectSub(column, as);
            } else
            {
                this.columns.push(column);
            }
        });

        return this;
    }

    selectSub(query: Closure | Builder | string, as: string): this
    {
        const [sql, bindings] = this.createSub(query);
        return this.selectRaw(`(${ sql }) as ${ this.grammar.wrap(as) }`, bindings);
    }

    selectRaw(expression: string, bindings: any[] = []): this
    {
        this.addSelect(new Expression(expression));

        if (bindings)
        {
            this.addBinding(bindings, 'select');
        }

        return this;
    }

    fromSub(query: Closure | Builder | string, as: string): this
    {
        const [sql, bindings] = this.createSub(query);
        return this.fromRaw(`(${ sql }) as ${ this.grammar.wrapTable(as) }`, bindings);
    }

    fromRaw(expression: string, bindings: any[] = []): this
    {
        this.from = new Expression(expression);
        this.addBinding(bindings, 'from');
        return this;
    }

    protected createSub(query: Closure | Builder | string): [string, any[]]
    {
        if (query instanceof Closure)
        {
            const newQuery = this.forSubQuery();
            query(newQuery);
            query = newQuery;
        }
        return this.parseSub(query);
    }

    protected parseSub(query: any): [string, any[]]
    {
        if (query instanceof this.constructor || query instanceof EloquentBuilder || query instanceof Relation)
        {
            query = this.prependDatabaseNameIfCrossDatabaseQuery(query);
            return [query.toSql(), query.getBindings()];
        } else if (typeof query === 'string')
        {
            return [query, []];
        } else
        {
            throw new Error('A subquery must be a query builder instance, a Closure, or a string.');
        }
    }

    protected prependDatabaseNameIfCrossDatabaseQuery(query: any): any
    {
        if (query.getConnection().getDatabaseName() !== this.connection.getDatabaseName())
        {
            const databaseName = query.getConnection().getDatabaseName();
            if (!query.from.startsWith(databaseName) && !query.from.includes('.'))
            {
                query.from(`${ databaseName }.${ query.from }`);
            }
        }
        return query;
    }

    addSelect(column: any[] | any): this
    {
        const columns = Array.isArray(column) ? column : Array.from(arguments);

        columns.forEach((column, as) =>
        {
            if (typeof as === 'string' && this.isQueryable(column))
            {
                if (this.columns === null)
                {
                    this.select(`${ this.from }.*`);
                }
                this.selectSub(column, as);
            } else
            {
                if (Array.isArray(this.columns) && this.columns.includes(column))
                {
                    return;
                }
                this.columns.push(column);
            }
        });

        return this;
    }

    distinct(...columns: any[]): this
    {
        if (columns.length > 0)
        {
            this.distinct = Array.isArray(columns[0]) || typeof columns[0] === 'boolean' ? columns[0] : columns;
        } else
        {
            this.distinct = true;
        }

        return this;
    }

    from(table: Closure | Builder | string, as?: string): this
    {
        if (this.isQueryable(table))
        {
            return this.fromSub(table, as);
        }

        this.from = as ? `${ table } as ${ as }` : table;
        return this;
    }

    useIndex(index: string): this
    {
        this.indexHint = new IndexHint('hint', index);
        return this;
    }

    forceIndex(index: string): this
    {
        this.indexHint = new IndexHint('force', index);
        return this;
    }

    ignoreIndex(index: string): this
    {
        this.indexHint = new IndexHint('ignore', index);
        return this;
    }

    join(table: Expression | string, first: Closure | Expression | string, operator: string | null = null, second: Expression | string | null = null, type: string = 'inner', where: boolean = false): this
    {
        const join = this.newJoinClause(this, type, table);
        if (first instanceof Closure)
        {
            first(join);
            this.joins.push(join);
            this.addBinding(join.getBindings(), 'join');
        } else
        {
            const method = where ? 'where' : 'on';
            this.joins.push(join[method](first, operator, second));
            this.addBinding(join.getBindings(), 'join');
        }
        return this;
    }

    joinWhere(table: Expression | string, first: Closure | Expression | string, operator: string, second: Expression | string, type: string = 'inner'): this
    {
        return this.join(table, first, operator, second, type, true);
    }

    joinSub(query: Closure | Builder | EloquentBuilder | string, as: string, first: Closure | Expression | string, operator: string | null = null, second: Expression | string | null = null, type: string = 'inner', where: boolean = false): this
    {
        const [sql, bindings] = this.createSub(query);
        const expression = `(${ sql }) as ${ this.grammar.wrapTable(as) }`;
        this.addBinding(bindings, 'join');
        return this.join(new Expression(expression), first, operator, second, type, where);
    }

    joinLateral(query: Closure | Builder | EloquentBuilder | string, as: string, type: string = 'inner'): this
    {
        const [sql, bindings] = this.createSub(query);
        const expression = `(${ sql }) as ${ this.grammar.wrapTable(as) }`;
        this.addBinding(bindings, 'join');
        this.joins.push(this.newJoinLateralClause(this, type, new Expression(expression)));
        return this;
    }

    leftJoinLateral(query: Closure | Builder | EloquentBuilder | string, as: string): this
    {
        return this.joinLateral(query, as, 'left');
    }

    leftJoin(table: Expression | string, first: Closure | Expression | string, operator: string | null = null, second: Expression | string | null = null): this
    {
        return this.join(table, first, operator, second, 'left');
    }

    leftJoinWhere(table: Expression | string, first: Closure | Expression | string, operator: string, second: Expression | string): this
    {
        return this.joinWhere(table, first, operator, second, 'left');
    }

    leftJoinSub(query: Closure | Builder | EloquentBuilder | string, as: string, first: Closure | Expression | string, operator: string | null = null, second: Expression | string | null = null): this
    {
        return this.joinSub(query, as, first, operator, second, 'left');
    }

    rightJoin(table: Expression | string, first: Closure | string, operator: string | null = null, second: Expression | string | null = null): this
    {
        return this.join(table, first, operator, second, 'right');
    }

    rightJoinWhere(table: Expression | string, first: Closure | Expression | string, operator: string, second: Expression | string): this
    {
        return this.joinWhere(table, first, operator, second, 'right');
    }

    rightJoinSub(query: Closure | Builder | EloquentBuilder | string, as: string, first: Closure | Expression | string, operator: string | null = null, second: Expression | string | null = null): this
    {
        return this.joinSub(query, as, first, operator, second, 'right');
    }

    crossJoin(table: Expression | string, first: Closure | Expression | string | null = null, operator: string | null = null, second: Expression | string | null = null): this
    {
        if (first)
        {
            return this.join(table, first, operator, second, 'cross');
        }
        this.joins.push(this.newJoinClause(this, 'cross', table));
        return this;
    }

    crossJoinSub(query: Closure | Builder | EloquentBuilder | string, as: string): this
    {
        const [sql, bindings] = this.createSub(query);
        const expression = `(${ sql }) as ${ this.grammar.wrapTable(as) }`;
        this.addBinding(bindings, 'join');
        this.joins.push(this.newJoinClause(this, 'cross', new Expression(expression)));
        return this;
    }

    newJoinClause(parentQuery: Builder, type: string, table: string): JoinClause
    {
        return new JoinClause(parentQuery, type, table);
    }

    newJoinLateralClause(parentQuery: Builder, type: string, table: string): JoinLateralClause
    {
        return new JoinLateralClause(parentQuery, type, table);
    }

    mergeWheres(wheres: any[], bindings: any[]): this
    {
        this.wheres = [...this.wheres, ...wheres];
        this.bindings['where'] = [...this.bindings['where'], ...bindings];
        return this;
    }

    where(column: ConditionExpression | string | any[] | Expression, operator: any = null, value: any = null, boolean: string = 'and'): this
    {
        if (column instanceof ConditionExpression)
        {
            const type = 'Expression';
            this.wheres.push({ type, column, boolean });
            return this;
        }

        if (Array.isArray(column))
        {
            return this.addArrayOfWheres(column, boolean);
        }

        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);

        if (column instanceof Closure && operator === null)
        {
            return this.whereNested(column, boolean);
        }

        if (this.isQueryable(column) && operator !== null)
        {
            const [sub, bindings] = this.createSub(column);
            this.addBinding(bindings, 'where');
            return this.where(new Expression(`(${ sub })`), operator, value, boolean);
        }

        if (this.invalidOperator(operator))
        {
            [value, operator] = [operator, '='];
        }

        if (this.isQueryable(value))
        {
            return this.whereSub(column, operator, value, boolean);
        }

        if (value === null)
        {
            return this.whereNull(column, boolean, operator !== '=');
        }

        let type = 'Basic';
        const columnString = column instanceof ExpressionContract ? this.grammar.getValue(column) : column;

        if (columnString.includes('->') && typeof value === 'boolean')
        {
            value = new Expression(value ? 'true' : 'false');
            if (typeof column === 'string')
            {
                type = 'JsonBoolean';
            }
        }

        if (this.isBitwiseOperator(operator))
        {
            type = 'Bitwise';
        }

        this.wheres.push({ type, column, operator, value, boolean });

        if (!(value instanceof ExpressionContract))
        {
            this.addBinding(this.flattenValue(value), 'where');
        }

        return this;
    }

    addArrayOfWheres(column: any[], boolean: string, method: string = 'where'): this
    {
        return this.whereNested((query) =>
        {
            for (const key in column)
            {
                const value = column[key];
                if (typeof key === 'number' && Array.isArray(value))
                {
                    query[method](...value);
                } else
                {
                    query[method](key, '=', value, boolean);
                }
            }
        }, boolean);
    }

    prepareValueAndOperator(value: any, operator: string, useDefault: boolean = false): [any, string]
    {
        if (useDefault)
        {
            return [operator, '='];
        } else if (this.invalidOperatorAndValue(operator, value))
        {
            throw new Error('Illegal operator and value combination.');
        }

        return [value, operator];
    }

    invalidOperatorAndValue(operator: string, value: any): boolean
    {
        return value === null && this.operators.includes(operator) && !['=', '<>', '!='].includes(operator);
    }

    invalidOperator(operator: string): boolean
    {
        return typeof operator !== 'string' || (!this.operators.includes(operator.toLowerCase()) && !this.grammar.getOperators().includes(operator.toLowerCase()));
    }

    isBitwiseOperator(operator: string): boolean
    {
        return this.bitwiseOperators.includes(operator.toLowerCase()) || this.grammar.getBitwiseOperators().includes(operator.toLowerCase());
    }

    orWhere(column: ConditionExpression | string | any[] | Expression, operator: any = null, value: any = null): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        return this.where(column, operator, value, 'or');
    }

    whereNot(column: ConditionExpression | string | any[] | Expression, operator: any = null, value: any = null, boolean: string = 'and'): this
    {
        if (Array.isArray(column))
        {
            return this.whereNested((query) =>
            {
                query.where(column, operator, value, boolean);
            }, boolean + ' not');
        }
        return this.where(column, operator, value, boolean + ' not');
    }

    orWhereNot(column: ConditionExpression | string | any[] | Expression, operator: any = null, value: any = null): this
    {
        return this.whereNot(column, operator, value, 'or');
    }

    whereColumn(first: Expression | string | any[], operator: string = null, second: string = null, boolean: string = 'and'): this
    {
        if (Array.isArray(first))
        {
            return this.addArrayOfWheres(first, boolean, 'whereColumn');
        }

        if (this.invalidOperator(operator))
        {
            [second, operator] = [operator, '='];
        }

        const type = 'Column';
        this.wheres.push({ type, first, operator, second, boolean });
        return this;
    }

    orWhereColumn(first: Expression | string | any[], operator: string = null, second: string = null): this
    {
        return this.whereColumn(first, operator, second, 'or');
    }

    whereRaw(sql: string, bindings: any[] = [], boolean: string = 'and'): this
    {
        this.wheres.push({ type: 'raw', sql, boolean });
        this.addBinding(bindings, 'where');
        return this;
    }

    orWhereRaw(sql: string, bindings: any[] = []): this
    {
        return this.whereRaw(sql, bindings, 'or');
    }

    whereIn(column: Expression | string, values: any, boolean: string = 'and', not: boolean = false): this
    {
        const type = not ? 'NotIn' : 'In';

        if (this.isQueryable(values))
        {
            const [query, subBindings] = this.createSub(values);
            values = [new Expression(query)];
            this.addBinding(subBindings, 'where');
        }

        if (values instanceof Arrayable)
        {
            values = values.toArray();
        }

        this.wheres.push({ type, column, values, boolean });

        if (values.length !== Arr.flatten(values, 1).length)
        {
            throw new Error('Nested arrays are not allowed in whereIn method.');
        }

        if (!(values instanceof Expression))
        {
            this.addBinding(this.cleanBindings(values), 'where');
        }

        return this;
    }

    orWhereIn(column: Expression | string, values: any): this
    {
        return this.whereIn(column, values, 'or');
    }

    whereNotIn(column: Expression | string, values: any, boolean: string = 'and'): this
    {
        return this.whereIn(column, values, boolean, true);
    }

    orWhereNotIn(column: Expression | string, values: any): this
    {
        return this.whereNotIn(column, values, 'or');
    }

    whereIntegerInRaw(column: string, values: Arrayable | any[], boolean: string = 'and', not: boolean = false): this
    {
        const type = not ? 'NotInRaw' : 'InRaw';

        if (values instanceof Arrayable)
        {
            values = values.toArray();
        }

        values = Arr.flatten(values).map(value => parseInt(value instanceof BackedEnum ? value.value : value));

        this.wheres.push({ type, column, values, boolean });
        return this;
    }

    orWhereIntegerInRaw(column: string, values: Arrayable | any[]): this
    {
        return this.whereIntegerInRaw(column, values, 'or');
    }

    whereIntegerNotInRaw(column: string, values: Arrayable | any[], boolean: string = 'and'): this
    {
        return this.whereIntegerInRaw(column, values, boolean, true);
    }

    orWhereIntegerNotInRaw(column: string, values: Arrayable | any[]): this
    {
        return this.whereIntegerNotInRaw(column, values, 'or');
    }

    whereNull(columns: Expression | string | any[], boolean: string = 'and', not: boolean = false): this
    {
        const type = not ? 'NotNull' : 'Null';

        Arr.wrap(columns).forEach(column =>
        {
            this.wheres.push({ type, column, boolean });
        });
        return this;
    }

    orWhereNull(column: Expression | string | any[]): this
    {
        return this.whereNull(column, 'or');
    }

    whereNotNull(columns: string | any[], boolean: string = 'and'): this
    {
        return this.whereNull(columns, boolean, true);
    }

    whereBetween(column: Expression | string, values: Iterable<any>, boolean: string = 'and', not: boolean = false): this
    {
        const type = 'between';

        if (values instanceof CarbonPeriod)
        {
            values = [values.getStartDate(), values.getEndDate()];
        }

        this.wheres.push({ type, column, values, boolean, not });
        this.addBinding(Array.from(values).slice(0, 2), 'where');

        return this;
    }

    whereBetweenColumns(column: Expression | string, values: any[], boolean: string = 'and', not: boolean = false): this
    {
        const type = 'betweenColumns';
        this.wheres.push({ type, column, values, boolean, not });
        return this;
    }

    orWhereBetween(column: Expression | string, values: Iterable<any>): this
    {
        return this.whereBetween(column, values, 'or');
    }

    orWhereBetweenColumns(column: Expression | string, values: any[]): this
    {
        return this.whereBetweenColumns(column, values, 'or');
    }

    whereNotBetween(column: Expression | string, values: Iterable<any>, boolean: string = 'and'): this
    {
        return this.whereBetween(column, values, boolean, true);
    }

    whereNotBetweenColumns(column: Expression | string, values: any[], boolean: string = 'and'): this
    {
        return this.whereBetweenColumns(column, values, boolean, true);
    }

    orWhereNotBetween(column: Expression | string, values: Iterable<any>): this
    {
        return this.whereNotBetween(column, values, 'or');
    }

    orWhereNotBetweenColumns(column: Expression | string, values: any[]): this
    {
        return this.whereNotBetweenColumns(column, values, 'or');
    }

    orWhereNotNull(column: Expression | string): this
    {
        return this.whereNotNull(column, 'or');
    }

    whereDate(column: Expression | string, operator: DateTimeInterface | string | null, value: DateTimeInterface | string | null = null, boolean: string = 'and'): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        value = this.flattenValue(value);
        if (value instanceof DateTimeInterface)
        {
            value = value.format('Y-m-d');
        }
        return this.addDateBasedWhere('Date', column, operator, value, boolean);
    }

    orWhereDate(column: Expression | string, operator: DateTimeInterface | string | null, value: DateTimeInterface | string | null = null): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        return this.whereDate(column, operator, value, 'or');
    }

    whereTime(column: Expression | string, operator: DateTimeInterface | string | null, value: DateTimeInterface | string | null = null, boolean: string = 'and'): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        value = this.flattenValue(value);
        if (value instanceof DateTimeInterface)
        {
            value = value.format('H:i:s');
        }
        return this.addDateBasedWhere('Time', column, operator, value, boolean);
    }

    orWhereTime(column: Expression | string, operator: DateTimeInterface | string | null, value: DateTimeInterface | string | null = null): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        return this.whereTime(column, operator, value, 'or');
    }

    whereDay(column: Expression | string, operator: DateTimeInterface | string | number | null, value: DateTimeInterface | string | number | null = null, boolean: string = 'and'): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        value = this.flattenValue(value);
        if (value instanceof DateTimeInterface)
        {
            value = value.format('d');
        }
        if (!(value instanceof ExpressionContract))
        {
            value = sprintf('%02d', value);
        }
        return this.addDateBasedWhere('Day', column, operator, value, boolean);
    }

    orWhereDay(column: Expression | string, operator: DateTimeInterface | string | number | null, value: DateTimeInterface | string | number | null = null): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        return this.whereDay(column, operator, value, 'or');
    }

    whereMonth(column: Expression | string, operator: DateTimeInterface | string | number | null, value: DateTimeInterface | string | number | null = null, boolean: string = 'and'): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        value = this.flattenValue(value);
        if (value instanceof DateTimeInterface)
        {
            value = value.format('m');
        }
        if (!(value instanceof ExpressionContract))
        {
            value = sprintf('%02d', value);
        }
        return this.addDateBasedWhere('Month', column, operator, value, boolean);
    }

    orWhereMonth(column: Expression | string, operator: DateTimeInterface | string | number | null, value: DateTimeInterface | string | number | null = null): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        return this.whereMonth(column, operator, value, 'or');
    }

    whereYear(column: Expression | string, operator: DateTimeInterface | string | number | null, value: DateTimeInterface | string | number | null = null, boolean: string = 'and'): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        value = this.flattenValue(value);
        if (value instanceof DateTimeInterface)
        {
            value = value.format('Y');
        }
        return this.addDateBasedWhere('Year', column, operator, value, boolean);
    }

    orWhereYear(column: Expression | string, operator: DateTimeInterface | string | number | null, value: DateTimeInterface | string | number | null = null): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        return this.whereYear(column, operator, value, 'or');
    }

    forNestedWhere(): this
    {
        return this.newQuery().from(this.from);
    }

    addNestedWhereQuery(query: Builder, boolean: string = 'and'): this
    {
        if (query.wheres.length)
        {
            const type = 'Nested';
            this.wheres.push({ type, query, boolean });
            this.addBinding(query.getRawBindings()['where'], 'where');
        }
        return this;
    }

    whereSub(column: Expression | string, operator: string, callback: Closure | Builder | EloquentBuilder, boolean: string): this
    {
        const type = 'Sub';
        let query: Builder;
        if (callback instanceof Closure)
        {
            callback(query = this.forSubQuery());
        } else
        {
            query = callback instanceof EloquentBuilder ? callback.toBase() : callback;
        }
        this.wheres.push({ type, column, operator, query, boolean });
        this.addBinding(query.getBindings(), 'where');
        return this;
    }

    whereExists(callback: Closure | Builder | EloquentBuilder, boolean: string = 'and', not: boolean = false): this
    {
        let query: Builder;
        if (callback instanceof Closure)
        {
            query = this.forSubQuery();
            callback(query);
        } else
        {
            query = callback instanceof EloquentBuilder ? callback.toBase() : callback;
        }
        return this.addWhereExistsQuery(query, boolean, not);
    }

    orWhereExists(callback: Closure | Builder | EloquentBuilder, not: boolean = false): this
    {
        return this.whereExists(callback, 'or', not);
    }

    whereNotExists(callback: Closure | Builder | EloquentBuilder, boolean: string = 'and'): this
    {
        return this.whereExists(callback, boolean, true);
    }

    orWhereNotExists(callback: Closure | Builder | EloquentBuilder): this
    {
        return this.orWhereExists(callback, true);
    }

    addWhereExistsQuery(query: Builder, boolean: string = 'and', not: boolean = false): this
    {
        const type = not ? 'NotExists' : 'Exists';
        this.wheres.push({ type, query, boolean });
        this.addBinding(query.getBindings(), 'where');
        return this;
    }

    whereRowValues(columns: string[], operator: string, values: any[], boolean: string = 'and'): this
    {
        if (columns.length !== values.length)
        {
            throw new Error('The number of columns must match the number of values');
        }
        const type = 'RowValues';
        this.wheres.push({ type, columns, operator, values, boolean });
        this.addBinding(this.cleanBindings(values));
        return this;
    }

    orWhereRowValues(columns: string[], operator: string, values: any[]): this
    {
        return this.whereRowValues(columns, operator, values, 'or');
    }

    whereJsonContains(column: string, value: any, boolean: string = 'and', not: boolean = false): this
    {
        const type = 'JsonContains';
        this.wheres.push({ type, column, value, boolean, not });
        if (!(value instanceof ExpressionContract))
        {
            this.addBinding(this.grammar.prepareBindingForJsonContains(value));
        }
        return this;
    }

    orWhereJsonContains(column: string, value: any): this
    {
        return this.whereJsonContains(column, value, 'or');
    }

    whereJsonDoesntContain(column: string, value: any, boolean: string = 'and'): this
    {
        return this.whereJsonContains(column, value, boolean, true);
    }

    orWhereJsonDoesntContain(column: string, value: any): this
    {
        return this.whereJsonDoesntContain(column, value, 'or');
    }

    whereJsonContainsKey(column: string, boolean: string = 'and', not: boolean = false): this
    {
        const type = 'JsonContainsKey';
        this.wheres.push({ type, column, boolean, not });
        return this;
    }

    orWhereJsonContainsKey(column: string): this
    {
        return this.whereJsonContainsKey(column, 'or');
    }

    whereJsonDoesntContainKey(column: string, boolean: string = 'and'): this
    {
        return this.whereJsonContainsKey(column, boolean, true);
    }

    orWhereJsonDoesntContainKey(column: string): this
    {
        return this.orWhereJsonContainsKey(column, 'or');
    }

    whereJsonLength(column: string, operator: any, value: any = null, boolean: string = 'and'): this
    {
        const type = 'JsonLength';
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        this.wheres.push({ type, column, operator, value, boolean });
        if (!(value instanceof ExpressionContract))
        {
            this.addBinding(parseInt(this.flattenValue(value)));
        }
        return this;
    }

    orWhereJsonLength(column: string, operator: any, value: any = null): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        return this.whereJsonLength(column, operator, value, 'or');
    }

    dynamicWhere(method: string, parameters: any[]): this
    {
        const finder = method.substring(5);
        const segments = finder.split(/(And|Or)(?=[A-Z])/);
        let connector = 'and';
        let index = 0;
        for (const segment of segments)
        {
            if (segment !== 'And' && segment !== 'Or')
            {
                this.addDynamic(segment, connector, parameters, index);
                index++;
            } else
            {
                connector = segment.toLowerCase();
            }
        }
        return this;
    }

    addDynamic(segment: string, connector: string, parameters: any[], index: number): void
    {
        const bool = connector.toLowerCase();
        this.where(Str.snake(segment), '=', parameters[index], bool);
    }

    whereFullText(columns: string | string[], value: string, options: any[] = [], boolean: string = 'and'): this
    {
        const type = 'Fulltext';
        columns = Array.isArray(columns) ? columns : [columns];
        this.wheres.push({ type, columns, value, options, boolean });
        this.addBinding(value);
        return this;
    }

    orWhereFullText(columns: string | string[], value: string, options: any[] = []): this
    {
        return this.whereFullText(columns, value, options, 'or');
    }

    whereAll(columns: string[], operator: any = null, value: any = null, boolean: string = 'and'): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        this.whereNested(query =>
        {
            columns.forEach(column =>
            {
                query.where(column, operator, value, 'and');
            });
        }, boolean);
        return this;
    }

    orWhereAll(columns: string[], operator: any = null, value: any = null): this
    {
        return this.whereAll(columns, operator, value, 'or');
    }

    whereAny(columns: string[], operator: any = null, value: any = null, boolean: string = 'and'): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        this.whereNested(query =>
        {
            columns.forEach(column =>
            {
                query.where(column, operator, value, 'or');
            });
        }, boolean);
        return this;
    }

    orWhereAny(columns: string[], operator: any = null, value: any = null): this
    {
        return this.whereAny(columns, operator, value, 'or');
    }

    groupBy(...groups: (Array | Expression | string)[]): this
    {
        groups.forEach(group =>
        {
            this.groups = [...this.groups, ...Arr.wrap(group)];
        });
        return this;
    }

    groupByRaw(sql: string, bindings: any[] = []): this
    {
        this.groups.push(new Expression(sql));
        this.addBinding(bindings, 'groupBy');
        return this;
    }

    having(column: Expression | Closure | string, operator: any = null, value: any = null, boolean: string = 'and'): this
    {
        let type = 'Basic';
        if (column instanceof ConditionExpression)
        {
            type = 'Expression';
            this.havings.push({ type, column, boolean });
            return this;
        }

        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);

        if (column instanceof Closure && operator === null)
        {
            return this.havingNested(column, boolean);
        }

        if (this.invalidOperator(operator))
        {
            [value, operator] = [operator, '='];
        }

        if (this.isBitwiseOperator(operator))
        {
            type = 'Bitwise';
        }

        this.havings.push({ type, column, operator, value, boolean });

        if (!(value instanceof ExpressionContract))
        {
            this.addBinding(this.flattenValue(value), 'having');
        }

        return this;
    }

    orHaving(column: Expression | Closure | string, operator: any = null, value: any = null): this
    {
        [value, operator] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
        return this.having(column, operator, value, 'or');
    }

    havingNested(callback: Closure, boolean: string = 'and'): this
    {
        callback(query = this.forNestedWhere());
        return this.addNestedHavingQuery(query, boolean);
    }

    addNestedHavingQuery(query: Builder, boolean: string = 'and'): this
    {
        if (query.havings.length)
        {
            const type = 'Nested';
            this.havings.push({ type, query, boolean });
            this.addBinding(query.getRawBindings()['having'], 'having');
        }
        return this;
    }

    havingNull(columns: string | string[], boolean: string = 'and', not: boolean = false): this
    {
        const type = not ? 'NotNull' : 'Null';
        Arr.wrap(columns).forEach(column =>
        {
            this.havings.push({ type, column, boolean });
        });
        return this;
    }

    orHavingNull(column: string): this
    {
        return this.havingNull(column, 'or');
    }

    havingNotNull(columns: string | string[], boolean: string = 'and'): this
    {
        return this.havingNull(columns, boolean, true);
    }

    orHavingNotNull(column: string): this
    {
        return this.havingNotNull(column, 'or');
    }

    havingBetween(column: string, values: iterable, boolean: string = 'and', not: boolean = false): this
    {
        const type = 'between';
        if (values instanceof CarbonPeriod)
        {
            values = [values.getStartDate(), values.getEndDate()];
        }
        this.havings.push({ type, column, values, boolean, not });
        this.addBinding(Array.slice(this.cleanBindings(Arr.flatten(values)), 0, 2), 'having');
        return this;
    }

    havingRaw(sql: string, bindings: any[] = [], boolean: string = 'and'): this
    {
        const type = 'Raw';
        this.havings.push({ type, sql, boolean });
        this.addBinding(bindings, 'having');
        return this;
    }

    orHavingRaw(sql: string, bindings: any[] = []): this
    {
        return this.havingRaw(sql, bindings, 'or');
    }

    orderBy(column: Expression | Builder | string, direction: string = 'asc'): this
    {
        if (this.isQueryable(column))
        {
            const [query, bindings] = this.createSub(column);
            column = new Expression(`(${ query })`);
            this.addBinding(bindings, this.unions ? 'unionOrder' : 'order');
        }

        direction = direction.toLowerCase();

        if (!['asc', 'desc'].includes(direction))
        {
            throw new InvalidArgumentException('Order direction must be "asc" or "desc".');
        }

        this[this.unions ? 'unionOrders' : 'orders'].push({ column, direction });
        return this;
    }

    orderByDesc(column: Expression | Builder | string): this
    {
        return this.orderBy(column, 'desc');
    }

    latest(column: string = 'created_at'): this
    {
        return this.orderBy(column, 'desc');
    }

    oldest(column: string = 'created_at'): this
    {
        return this.orderBy(column, 'asc');
    }

    inRandomOrder(seed: string | number = ''): this
    {
        return this.orderByRaw(this.grammar.compileRandom(seed));
    }

    orderByRaw(sql: string, bindings: any[] = []): this
    {
        const type = 'Raw';
        this[this.unions ? 'unionOrders' : 'orders'].push({ type, sql });
        this.addBinding(bindings, this.unions ? 'unionOrder' : 'order');
        return this;
    }

    skip(value: number): this
    {
        return this.offset(value);
    }

    offset(value: number): this
    {
        const property = this.unions ? 'unionOffset' : 'offset';
        this[property] = Math.max(0, value);
        return this;
    }

    take(value: number): this
    {
        return this.limit(value);
    }

    limit(value: number): this
    {
        const property = this.unions ? 'unionLimit' : 'limit';
        if (value >= 0)
        {
            this[property] = value !== null ? value : null;
        }
        return this;
    }

    groupLimit(value: number, column: string): this
    {
        if (value >= 0)
        {
            this.groupLimit = { value, column };
        }
        return this;
    }

    forPage(page: number, perPage: number = 15): this
    {
        return this.offset((page - 1) * perPage).limit(perPage);
    }

    forPageBeforeId(perPage: number = 15, lastId: number = 0, column: string = 'id'): this
    {
        this.orders = this.removeExistingOrdersFor(column);
        if (lastId !== null)
        {
            this.where(column, '<', lastId);
        }
        return this.orderBy(column, 'desc').limit(perPage);
    }

    forPageAfterId(perPage: number = 15, lastId: number = 0, column: string = 'id'): this
    {
        this.orders = this.removeExistingOrdersFor(column);
        if (lastId !== null)
        {
            this.where(column, '>', lastId);
        }
        return this.orderBy(column, 'asc').limit(perPage);
    }

    reorder(column: any = null, direction: string = 'asc'): this
    {
        this.orders = null;
        this.unionOrders = null;
        this.bindings['order'] = [];
        this.bindings['unionOrder'] = [];
        if (column)
        {
            return this.orderBy(column, direction);
        }
        return this;
    }

    union(query: any, all: boolean = false): this
    {
        if (query instanceof Function)
        {
            query(query = this.newQuery());
        }
        this.unions.push({ query, all });
        this.addBinding(query.getBindings(), 'union');
        return this;
    }

    unionAll(query: any): this
    {
        return this.union(query, true);
    }

    lock(value: boolean | string = true): this
    {
        this.lock = value;
        if (this.lock !== null)
        {
            this.useWritePdo();
        }
        return this;
    }

    lockForUpdate(): this
    {
        return this.lock(true);
    }

    sharedLock(): this
    {
        return this.lock(false);
    }

    beforeQuery(callback: Function): this
    {
        this.beforeQueryCallbacks.push(callback);
        return this;
    }

    applyBeforeQueryCallbacks(): void
    {
        this.beforeQueryCallbacks.forEach(callback =>
        {
            callback(this);
        });
        this.beforeQueryCallbacks = [];
    }

    afterQuery(callback: Function): this
    {
        this.afterQueryCallbacks.push(callback);
        return this;
    }

    applyAfterQueryCallbacks(result: any): any
    {
        this.afterQueryCallbacks.forEach(afterQueryCallback =>
        {
            result = afterQueryCallback(result) || result;
        });
        return result;
    }

    toSql(): string
    {
        this.applyBeforeQueryCallbacks();
        return this.grammar.compileSelect(this);
    }

    toRawSql(): string
    {
        return this.grammar.substituteBindingsIntoRawSql(
            this.toSql(), this.connection.prepareBindings(this.getBindings())
        );
    }

    find(id: number | string, columns: any[] | string = ['*']): any
    {
        return this.where('id', '=', id).first(columns);
    }

    findOr(id: any, columns: any[] | Function = ['*'], callback: Function | null = null): any
    {
        if (columns instanceof Function)
        {
            callback = columns;
            columns = ['*'];
        }
        const data = this.find(id, columns);
        if (data !== null)
        {
            return data;
        }
        return callback();
    }

    value(column: string): any
    {
        const result = this.first([column]);
        return result ? result[column] : null;
    }

    rawValue(expression: string, bindings: any[] = []): any
    {
        const result = this.selectRaw(expression, bindings).first();
        return result ? result[0] : null;
    }

    soleValue(column: string): any
    {
        const result = this.sole([column]);
        return result[column];
    }

    get(columns: any[] = ['*']): any
    {
        const items = this.onceWithColumns(Arr.wrap(columns), () =>
        {
            return this.processor.processSelect(this, this.runSelect());
        });
        return this.applyAfterQueryCallbacks(
            this.groupLimit ? this.withoutGroupLimitKeys(items) : items
        );
    }

    protected runSelect(): any[]
    {
        return this.connection.select(
            this.toSql(), this.getBindings(), !this.useWritePdo
        );
    }

    protected withoutGroupLimitKeys(items: any): any
    {
        const keysToRemove = ['laravel_row'];
        if (typeof this.groupLimit['column'] === 'string')
        {
            const column = last(this.groupLimit['column'].split('.'));
            keysToRemove.push(`@laravel_group := ${ this.grammar.wrap(column) }`);
            keysToRemove.push(`@laravel_group := ${ this.grammar.wrap('pivot_' + column) }`);
        }
        items.forEach((item: any) =>
        {
            keysToRemove.forEach((key: string) =>
            {
                delete item[key];
            });
        });
        return items;
    }

    paginate(perPage = 15, columns = ['*'], pageName = 'page', page: number | null = null, total: number | Closure | null = null): any
    {
        page = page || Paginator.resolveCurrentPage(pageName);
        total = value(total) ?? this.getCountForPagination();
        perPage = perPage instanceof Closure ? perPage(total) : perPage;
        const results = total ? this.forPage(page, perPage).get(columns) : collect();
        return this.paginator(results, total, perPage, page, {
            'path': Paginator.resolveCurrentPath(),
            'pageName': pageName,
        });
    }

    simplePaginate(perPage = 15, columns = ['*'], pageName = 'page', page: number | null = null): any
    {
        page = page || Paginator.resolveCurrentPage(pageName);
        this.offset((page - 1) * perPage).limit(perPage + 1);
        return this.simplePaginator(this.get(columns), perPage, page, {
            'path': Paginator.resolveCurrentPath(),
            'pageName': pageName,
        });
    }

    cursorPaginate(perPage = 15, columns = ['*'], cursorName = 'cursor', cursor: string | null = null): any
    {
        return this.paginateUsingCursor(perPage, columns, cursorName, cursor);
    }

    protected ensureOrderForCursorPagination(shouldReverse = false): any
    {
        if (!this.orders.length && !this.unionOrders.length)
        {
            this.enforceOrderBy();
        }
        const reverseDirection = (order: any) =>
        {
            if (!order.hasOwnProperty('direction')) return order;
            order.direction = order.direction === 'asc' ? 'desc' : 'asc';
            return order;
        };
        if (shouldReverse)
        {
            this.orders = this.orders.map(reverseDirection);
            this.unionOrders = this.unionOrders.map(reverseDirection);
        }
        const orders = this.unionOrders.length ? this.unionOrders : this.orders;
        return collect(orders).filter((order: any) => Arr.has(order, 'direction')).values();
    }

    getCountForPagination(columns = ['*']): number
    {
        const results = this.runPaginationCountQuery(columns);
        if (!results[0])
        {
            return 0;
        } else if (typeof results[0] === 'object')
        {
            return parseInt(results[0].aggregate);
        }
        return parseInt(array_change_key_case(results[0])['aggregate']);
    }

    protected runPaginationCountQuery(columns = ['*']): any[]
    {
        if (this.groups || this.havings)
        {
            const clone = this.cloneForPaginationCount();
            if (!clone.columns && this.joins.length)
            {
                clone.select(`${ this.from }.*`);
            }
            return this.newQuery()
                .from(new Expression(`(${ clone.toSql() }) as ${ this.grammar.wrap('aggregate_table') }`))
                .mergeBindings(clone)
                .setAggregate('count', this.withoutSelectAliases(columns))
                .get().all();
        }
        const without = this.unions ? ['orders', 'limit', 'offset'] : ['columns', 'orders', 'limit', 'offset'];
        return this.cloneWithout(without)
            .cloneWithoutBindings(this.unions ? ['order'] : ['select', 'order'])
            .setAggregate('count', this.withoutSelectAliases(columns))
            .get().all();
    }

    protected cloneForPaginationCount(): this
    {
        return this.cloneWithout(['orders', 'limit', 'offset'])
            .cloneWithoutBindings(['order']);
    }

    protected withoutSelectAliases(columns: any[]): any[]
    {
        return columns.map((column: any) =>
        {
            if (typeof column === 'string' && column.toLowerCase().includes(' as '))
            {
                const aliasPosition = column.toLowerCase().indexOf(' as ');
                return column.substring(0, aliasPosition);
            }
            return column;
        });
    }

    cursor(): any
    {
        if (!this.columns)
        {
            this.columns = ['*'];
        }
        return new LazyCollection(() =>
        {
            for (const item of this.connection.cursor(
                this.toSql(), this.getBindings(), !this.useWritePdo
            ))
            {
                yield item;
            }
        }).map((item: any) =>
        {
            return this.applyAfterQueryCallbacks(collect([item])).first();
        }).reject((item: any) => item === null);
    }

    enforceOrderBy(): void
    {
        if (!this.orders.length && !this.unionOrders.length)
        {
            throw new RuntimeException('You must specify an orderBy clause when using this function.');
        }
    }

    pluck(column: string, key: string | null = null): any
    {
        const queryResult = this.onceWithColumns(
            key === null ? [column] : [column, key],
            () => this.processor.processSelect(this, this.runSelect())
        );

        if (!queryResult.length)
        {
            return collect();
        }

        const columnStripped = this.stripTableForPluck(column);
        const keyStripped = this.stripTableForPluck(key);

        return this.applyAfterQueryCallbacks(
            Array.isArray(queryResult[0])
                ? this.pluckFromArrayColumn(queryResult, columnStripped, keyStripped)
                : this.pluckFromObjectColumn(queryResult, columnStripped, keyStripped)
        );
    }

    protected stripTableForPluck(column: string | null): string | null
    {
        if (column === null) return column;
        const columnString = column instanceof ExpressionContract ? this.grammar.getValue(column) : column;
        const separator = columnString.toLowerCase().includes(' as ') ? ' as ' : '.';
        return last(columnString.split(new RegExp(`${ separator }`, 'i')));
    }

    protected pluckFromObjectColumn(queryResult: any[], column: string, key: string | null): any
    {
        const results = [];
        if (key === null)
        {
            queryResult.forEach(row => results.push(row[column]));
        } else
        {
            queryResult.forEach(row => results[row[key]] = row[column]);
        }
        return collect(results);
    }

    protected pluckFromArrayColumn(queryResult: any[], column: string, key: string | null): any
    {
        const results = [];
        if (key === null)
        {
            queryResult.forEach(row => results.push(row[column]));
        } else
        {
            queryResult.forEach(row => results[row[key]] = row[column]);
        }
        return collect(results);
    }

    implode(column: string, glue: string = ''): string
    {
        return this.pluck(column).implode(glue);
    }

    exists(): boolean
    {
        this.applyBeforeQueryCallbacks();
        const results = this.connection.select(
            this.grammar.compileExists(this), this.getBindings(), !this.useWritePdo
        );
        if (results[0])
        {
            const result = Array.isArray(results[0]) ? results[0] : Object.assign({}, results[0]);
            return Boolean(result['exists']);
        }
        return false;
    }

    doesntExist(): boolean
    {
        return !this.exists();
    }

    existsOr(callback: Closure): any
    {
        return this.exists() ? true : callback();
    }

    doesntExistOr(callback: Closure): any
    {
        return this.doesntExist() ? true : callback();
    }

    count(columns = '*'): number
    {
        return parseInt(this.aggregate('count', Arr.wrap(columns)));
    }

    min(column: string): any
    {
        return this.aggregate('min', [column]);
    }

    max(column: string): any
    {
        return this.aggregate('max', [column]);
    }

    sum(column: string): number
    {
        const result = this.aggregate('sum', [column]);
        return result ? result : 0;
    }

    avg(column: string): number
    {
        return this.aggregate('avg', [column]);
    }

    average(column: string): number
    {
        return this.avg(column);
    }

    protected aggregate(functionName: string, columns: string[] = ['*']): any
    {
        const results = this.cloneWithout(this.unions || this.havings ? [] : ['columns'])
            .cloneWithoutBindings(this.unions || this.havings ? [] : ['select'])
            .setAggregate(functionName, columns)
            .get(columns);

        if (results.length)
        {
            return results[0].aggregate;
        }
    }

    protected numericAggregate(functionName: string, columns: string[] = ['*']): number
    {
        const result = this.aggregate(functionName, columns);
        if (!result) return 0;
        return typeof result === 'number' ? result : parseFloat(result);
    }

    protected setAggregate(functionName: string, columns: string[]): this
    {
        this.aggregate = { function: functionName, columns };
        if (!this.groups.length)
        {
            this.orders = null;
            this.bindings['order'] = [];
        }
        return this;
    }

    protected onceWithColumns(columns: string[], callback: () => any): any
    {
        const original = this.columns;
        this.columns = columns;
        const result = callback();
        this.columns = original;
        return result;
    }

    insert(values: any[]): boolean
    {
        if (!values.length) return true;
        const isArrayOfObjects = values.every(val => typeof val === 'object' && !Array.isArray(val));
        if (!isArrayOfObjects)
        {
            values = [values];
        }
        values.forEach(value => Object.keys(value).sort());
        this.applyBeforeQueryCallbacks();
        return this.connection.insert(
            this.grammar.compileInsert(this, values),
            this.flattenValues(values)
        );
    }

    insertOrIgnore(values: any[]): number
    {
        if (!values.length) return 0;
        const isArrayOfObjects = values.every(val => typeof val === 'object' && !Array.isArray(val));
        if (!isArrayOfObjects)
        {
            values = [values];
        }
        values.forEach(value => Object.keys(value).sort());
        this.applyBeforeQueryCallbacks();
        return this.connection.affectingStatement(
            this.grammar.compileInsertOrIgnore(this, values),
            this.flattenValues(values)
        );
    }

    insertGetId(values: any[], sequence: string | null = null): number
    {
        this.applyBeforeQueryCallbacks();
        const sql = this.grammar.compileInsertGetId(this, values, sequence);
        return this.processor.processInsertGetId(this, sql, values, sequence);
    }

    insertUsing(columns: string[], query: any): number
    {
        this.applyBeforeQueryCallbacks();
        const [sql, bindings] = this.createSub(query);
        return this.connection.affectingStatement(
            this.grammar.compileInsertUsing(this, columns, sql),
            bindings
        );
    }

    insertOrIgnoreUsing(columns: string[], query: any): number
    {
        this.applyBeforeQueryCallbacks();
        const [sql, bindings] = this.createSub(query);
        return this.connection.affectingStatement(
            this.grammar.compileInsertOrIgnoreUsing(this, columns, sql),
            bindings
        );
    }

    update(values: any): number
    {
        this.applyBeforeQueryCallbacks();
        const formattedValues = Object.entries(values).map(([key, value]) => ({
            value: value instanceof this.constructor ? `(${ value.toSql() })` : value,
            bindings: value instanceof this.constructor ? value.getBindings() : value
        }));
        const sql = this.grammar.compileUpdate(this, formattedValues);
        return this.connection.update(sql, this.cleanBindings(
            this.grammar.prepareBindingsForUpdate(this.bindings, formattedValues)
        ));
    }

    updateFrom(values: any): number
    {
        if (typeof this.grammar.compileUpdateFrom !== 'function')
        {
            throw new Error('This database engine does not support the updateFrom method.');
        }
        this.applyBeforeQueryCallbacks();
        const sql = this.grammar.compileUpdateFrom(this, values);
        return this.connection.update(sql, this.cleanBindings(
            this.grammar.prepareBindingsForUpdateFrom(this.bindings, values)
        ));
    }

    updateOrInsert(attributes: Record<string, any>, values: Record<string, any> = {}): boolean
    {
        if (!this.where(attributes).exists())
        {
            return this.insert({ ...attributes, ...values });
        }

        if (Object.keys(values).length === 0)
        {
            return true;
        }

        return !!this.limit(1).update(values);
    }

    upsert(values: Record<string, any>[], uniqueBy: string | string[], update: Record<string, any> | null = null): number
    {
        if (values.length === 0)
        {
            return 0;
        }

        if (update === [])
        {
            return this.insert(values) as number;
        }

        if (!Array.isArray(values[0]))
        {
            values = [values];
        } else
        {
            values.forEach(value =>
            {
                const sortedKeys = Object.keys(value).sort();
                const newValue: Record<string, any> = {};
                sortedKeys.forEach(key => newValue[key] = value[key]);
                value = newValue;
            });
        }

        if (update === null)
        {
            update = Object.keys(values[0]);
        }

        this.applyBeforeQueryCallbacks();

        const bindings = this.cleanBindings(
            [...values.flat(1), ...Object.values(update).filter(value => typeof value === 'number' || typeof value === 'string')]
        );

        return this.connection.affectingStatement(
            this.grammar.compileUpsert(this, values, Array.isArray(uniqueBy) ? uniqueBy : [uniqueBy], update),
            bindings
        );
    }

    increment(column: string, amount: number = 1, extra: Record<string, any> = {}): number
    {
        if (typeof amount !== 'number')
        {
            throw new Error('Non-numeric value passed to increment method.');
        }

        return this.incrementEach({ [column]: amount }, extra);
    }

    incrementEach(columns: Record<string, number>, extra: Record<string, any> = {}): number
    {
        Object.entries(columns).forEach(([column, amount]) =>
        {
            if (typeof amount !== 'number')
            {
                throw new Error(`Non-numeric value passed as increment amount for column: '${ column }'.`);
            }

            columns[column] = this.raw(`${ this.grammar.wrap(column) } + ${ amount }`);
        });

        return this.update({ ...columns, ...extra });
    }

    decrement(column: string, amount: number = 1, extra: Record<string, any> = {}): number
    {
        if (typeof amount !== 'number')
        {
            throw new Error('Non-numeric value passed to decrement method.');
        }

        return this.decrementEach({ [column]: amount }, extra);
    }

    decrementEach(columns: Record<string, number>, extra: Record<string, any> = {}): number
    {
        Object.entries(columns).forEach(([column, amount]) =>
        {
            if (typeof amount !== 'number')
            {
                throw new Error(`Non-numeric value passed as decrement amount for column: '${ column }'.`);
            }

            columns[column] = this.raw(`${ this.grammar.wrap(column) } - ${ amount }`);
        });

        return this.update({ ...columns, ...extra });
    }

    delete(id: any = null): number
    {
        if (id !== null)
        {
            this.where(`${ this.from }.id`, '=', id);
        }

        this.applyBeforeQueryCallbacks();

        return this.connection.delete(
            this.grammar.compileDelete(this), this.cleanBindings(
                this.grammar.prepareBindingsForDelete(this.bindings)
            )
        );
    }

    truncate(): void
    {
        this.applyBeforeQueryCallbacks();

        Object.entries(this.grammar.compileTruncate(this)).forEach(([sql, bindings]) =>
        {
            this.connection.statement(sql, bindings);
        });
    }

    addBinding(value: any, type: string = 'where'): this
    {
        if (!(type in this.bindings))
        {
            throw new Error(`Invalid binding type: ${ type }.`);
        }

        if (Array.isArray(value))
        {
            this.bindings[type] = [...this.bindings[type], ...value.map(this.castBinding)];
        } else
        {
            this.bindings[type].push(this.castBinding(value));
        }

        return this;
    }

    castBinding(value: any): any
    {
        if (value instanceof UnitEnum)
        {
            return 'value' in value ? value.value : value.name;
        }

        return value;
    }

    mergeBindings(query: QueryBuilder): this
    {
        Object.keys(query.bindings).forEach(key =>
        {
            this.bindings[key] = this.bindings[key] || [];
            this.bindings[key].push(...query.bindings[key]);
        });
        return this;
    }

    cleanBindings(bindings: any[]): any[]
    {
        return bindings.filter(binding => !(binding instanceof ExpressionContract)).map(this.castBinding);
    }

    flattenValue(value: any): any
    {
        return Array.isArray(value) ? value.flat()[0] : value;
    }

    defaultKeyName(): string
    {
        return 'id';
    }

    getConnection(): DatabaseConnection
    {
        return this.connection;
    }

    getProcessor(): Processor
    {
        return this.processor;
    }

    getGrammar(): Grammar
    {
        return this.grammar;
    }

    useWritePdo(): this
    {
        this.useWritePdo = true;
        return this;
    }

    isQueryable(value: any): boolean
    {
        return value instanceof QueryBuilder ||
            value instanceof EloquentBuilder ||
            value instanceof Relation ||
            value instanceof Function;
    }

    clone(): this
    {
        return new (this.constructor as any)(this.connection, this.grammar, this.processor);
    }

    cloneWithout(properties: string[]): this
    {
        const clone = this.clone();
        properties.forEach(property =>
        {
            clone[property] = null;
        });
        return clone;
    }

    cloneWithoutBindings(except: string[]): this
    {
        const clone = this.clone();
        except.forEach(type =>
        {
            clone.bindings[type] = [];
        });
        return clone;
    }

    dump(...args: any[]): this
    {
        console.log(this.toSql(), this.getBindings(), ...args);
        return this;
    }

    dumpRawSql(): this
    {
        console.log(this.toRawSql());
        return this;
    }

    dd(): never
    {
        console.log(this.toSql(), this.getBindings());
        throw new Error('Dump and die');
    }

    ddRawSql(): never
    {
        console.log(this.toRawSql());
        throw new Error('Dump and die');
    }

    dynamicMethodHandler(method: string, parameters: any[]): any
    {
        // Implement dynamic method handling logic here
    }

    __call(method: string, parameters: any[]): any
    {
        if (method.startsWith('where'))
        {
            return this.dynamicWhere(method, parameters);
        }

        throw new Error(`No such method: ${ method }`);
    }

}