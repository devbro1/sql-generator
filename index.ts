export class Query {

    private param_select : string[] = [];
    private param_table: string = '';
    private param_where: any[] = [];

    constructor() {

    }

    public select(selects : string | string[]) {
        if (typeof selects === 'string')
        {
            this.param_select.push(selects);
        }
        else if(Array.isArray(selects))
        {
            this.param_select = [...this.param_table, ...selects ];
        }

        return this;
    }

    public from(table: string) {
        this.param_table = table;

        return this;
    }

    public where(column: string,value: any, options: object = {condition: '='}) {
        this.param_where.push({column_name: column, value: value, options: options})

        return this;
    }

    public toFullSQL() {
        let rc : string[] = [];
        if(this.param_select.length > 0)
        {
            rc.push('SELECT ' + this.param_select.reduce((a,b) => {
                return a + ', ' + b; 
            }));
        }

        if(this.param_table) {
            rc.push('FROM ' + this.param_table);
        }

        if(this.param_where.length) {
            rc.push('WHERE');
            this.param_where.map((w) => {
                let cond = '=';
                let value = w.value;
                if(w.options?.condition)
                {
                    cond = w.options.condition;
                }

                if(typeof value == 'string')
                {
                    value = '\'' + value + '\'';
                }
                else if(typeof value == 'number')
                {
                    value = value;
                }
                else
                {

                }
                rc.push(w.column_name + ' ' + cond + ' ' + value);
            })
        }

        let rc_str = '';
        rc_str = rc.reduce((a,b) => {
            return a + ' ' + b;
        })

        return rc_str;
    }
}