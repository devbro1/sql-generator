import { rcompare } from "semver";

export default class Arr {
    public static wrap(value:any) {
        if(typeof value === 'undefined') {
            return [];
        }

        return Array.isArray(value)? value : [value];
    }

    public static flatten(array: any, depth: number = Infinity): any[] | any {
        if(Array.isArray(array)) {
            let result: any[] = [];
            for (const item of array) {
                let value = item;

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
        else {
            let result: any = {};
            for (const key of Object.keys(array)) {
                let value = array[key];

                if (!Array.isArray(value)) {
                    result.push(value);
                } else {
                    let values = {};
                    if(depth === 1) {
                        // @ts-ignore
                        values[key] = value;
                    }
                    else {
                        values = Arr.flatten(value, depth - 1);
                    }

                    for (const key2 of Object.keys(values)) {
                        // @ts-ignore
                        let value2 = values[key2];
                        result[key2] = value2;
                    }
                }
            }

            return result;
        }
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

    public static slice(value:Array<any>, a:number,b:number) {
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

    static toObject(arr: any | object) {
        let rc = {};

        if (Array.isArray(arr)) {
            rc = {...arr};
        }
        else {
            rc = {...arr};
        }

        for(const key in Object.keys(rc)) {
            // @ts-ignore
            if(Array.isArray(rc[key])) {
                // @ts-ignore
                rc[key] = Arr.toObject(rc[key]);
            }
        }

        return rc;
    }
}