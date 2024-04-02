export class Connection
{
    escape(value: string | number | boolean | null, binary = false): string
    {
        // Implement escape logic here
        return ''; // Placeholder for actual implementation
    }

    getConfig(c:string) {
        return '';
    }

    getServerVersion() {
        return '13.0';
    }

    statement(statement:string) {
        
    }

    query(c:string):any {

    }

    isMaria(): boolean {
        return false;
    }

    getSchemaBuilder(): any {
        
    }
}