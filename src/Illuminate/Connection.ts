export class Connection
{
    getDatabaseName(): string
    {
        throw new Error("Method not implemented.");
    }
    getSchemaGrammar(): import("../schema/Grammars/Grammar").Grammar
    {
        throw new Error("Method not implemented.");
    }
    escape(value: string | number | boolean | null, binary = false): string
    {
        // Implement escape logic here
        return ''; // Placeholder for actual implementation
    }

    getConfig(c:string): string {
        return '';
    }

    getServerVersion() {
        return '13.0';
    }

    statement(statement:string): boolean {
        return false;
    }

    query(c:string):any {

    }

    isMaria(): boolean {
        return false;
    }

    getSchemaBuilder(): any {
        
    }

    getTablePrefix(): string {
        return "";
    }

    getPostProcessor(): any {

    }

    selectFromWriteConnection(a: any): any {

    }

    scalar(query: string, bindings: any[] = [], useReadPdo: boolean = true): any {
        const record = this.selectOne(query, bindings, useReadPdo);
        if (record === null) {
            return null;
        }
    
        const recordArray = Object.values(record);
        if (recordArray.length > 1) {
            throw new Error('MultipleColumnsSelectedException');
        }
    
        return recordArray[0];
    }

    selectOne(query: string, bindings: any[] = [], useReadPdo: boolean = true): any {
        const records = this.select(query, bindings, useReadPdo);
        return records.shift();
    }

    async select(query: string, bindings: any[] = [], useReadPdo: boolean = true): Promise<any[]> {
        return this.run(query, bindings, async (query: string, bindings: any[]) => {
            if (this.pretending()) {
                return [];
            }
    
            const statement = this.prepared(
                await this.getPdoForSelect(useReadPdo).prepare(query)
            );
    
            this.bindValues(statement, this.prepareBindings(bindings));
    
            await statement.execute();
    
            return statement.fetchAll();
        });
    }
}