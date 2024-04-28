class Arr {

    static wrap(value:any) {
        if(typeof value === 'undefined') {
            return [];
        }

        return Array.isArray(value)? value : [value];
    }

    static flatten(value:any,depth:number=Infinity): any[] {

    }

    static has(value:array,keys) {

    }

    statis slice(value) {

    }

    static last(array:any[]): any {
        return array[array.length - 1];
    }
}