export default class Arr {

    static wrap(value:any) {
        if(typeof value === 'undefined') {
            return [];
        }

        return Array.isArray(value)? value : [value];
    }

    public static flatten(array: any, depth: number = Infinity): any[] {
        let result: any[] = [];

        for (const item of array) {
            let value = item; // Assuming 'Collection' equivalence is handled elsewhere if needed

            if (!Array.isArray(value)) {
                result.push(value);
            } else {
                const values = depth === 1
                    ? [...value]
                    : Arr.flatten(value, depth - 1);

                for (const val of values) {
                    result.push(val);
                }
            }
        }

        return result;
    }

    public static exists(array: any, key: string | number) {
        if (typeof key === 'number' && !Number.isInteger(key)) {
            key = key.toString();
        }

        return key in array;
    }

    public static has(array: any, keys: any[] | any): boolean {
        let keysArray = Array.isArray(keys) ? keys : [keys];

        if (!array || keysArray.length === 0) {
            return false;
        }

        for (const key of keysArray) {
            let subKeyArray = array;

            if (Arr.exists(array, key)) {
                continue;
            }

            const segments = key.split('.');
            for (const segment of segments) {
                if (Arr.accessible(subKeyArray) && Arr.exists(subKeyArray, segment)) {
                    subKeyArray = subKeyArray[segment];
                } else {
                    return false;
                }
            }
        }

        return true;
    }

    public static accessible(value: any): boolean {
        return Array.isArray(value) || (typeof value === 'object' && value !== null && 'offsetExists' in value);
    }

    static slice(value:Array<any>, a:number,b:number) {
        return value.slice(a,b);
    }

    static last(array:any[]): any {
        return array[array.length - 1];
    }

    public static except<T extends Record<string, any>>(
        obj: T,
        keys: string[] | string
    ): Partial<T> {
        const keysArray = Array.isArray(keys) ? keys : [keys];

        const result: Partial<T> = { ...obj };
        for (const key of keysArray) {
            delete result[key];
        }

        return result;
    }
}