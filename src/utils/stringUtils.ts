export function replaceBindings(s: string, bindings: object = {}, escape_method = (x:any) => { return x}) : string
{
    let rc = "";
    while (0 < s.length)
    {
        let match : RegExpMatchArray | null = s.match(/:?:(.*?):/);
        if (match)
        {
            rc += s.substring(0, match.index);
            const token_length = match[0].length;
            const binding_name = match[1] || "";
            
            // @ts-expect-error dynamic access of object by key
            if (!binding_name || typeof bindings[binding_name] === 'undefined')
            {
                throw Error("token " + match[1] + " was not found");
            }

            // @ts-expect-error dynamic access of object by key
            let binding = bindings[binding_name];

            if (match[0][1] !== ':')
            {
                binding = escape_method(binding);
            }

            rc += binding;
            // @ts-ignore
            s = s.substring(match.index + token_length);
        }
        else
        {
            rc += s;
            s = "";
        }
    }

    return rc;
}