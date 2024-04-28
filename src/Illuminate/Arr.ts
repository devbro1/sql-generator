export default class Arr {

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

    static slice(value,a,b) {

    }

    static last(array:any[]): any {
        return array[array.length - 1];
    }

    static except(array:any[],key) {

    }
}