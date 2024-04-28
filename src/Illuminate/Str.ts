import { Stream } from "stream";

export default class Str {
    static snake(str: string):string {
        return '';
    }

    static replaceFirst(searchValue:string,replaceValue:string,str:string): string {
        return str.replace(searchValue,replaceValue);
    }
}