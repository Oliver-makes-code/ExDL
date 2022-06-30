
export type ExdlDoc = {
    compat?: string,
    content: (ExdlTag|string)[]
}
export type ExdlTag = {
    name: string,
    meta?: string,
    selfClose: SelfCloseType,
    content?: (ExdlTag|string)[]
}
export enum SelfCloseType {
    NONE,
    NO_SLASH,
    NORMAL
}

export function parse(exdl: string): string {
    var doc = parseToDoc(exdl)
    var out = ""
    if (doc.compat) {
        out += "<!DOCTYPE "+doc.compat!+">\n"
    }
    out += parseTag(doc.content)
    return out
}

function parseTag(tags: (ExdlTag|string)[], indent: number = 0): string {
    var out = ""
    for (let tag of tags) {
        if (typeof tag == "string")
            out += " ".repeat(indent) + tag + "\n"
        else {
            var outTag = " ".repeat(indent) + "<"+tag.name + (!!tag.meta? " " + tag.meta!: "") + (tag.selfClose == SelfCloseType.NORMAL? " /": "") + ">"
            if (tag.selfClose == SelfCloseType.NONE) {
                var input = parseTag(tag.content!, indent+1)
                outTag += "\n"+input+" ".repeat(indent)+"</"+tag.name+">"
            }
            outTag += "\n"
            out += outTag
        }
    }
    return out
}

export function parseToDoc(exdl: string): ExdlDoc {
    exdl = exdl.trim()
    while (exdl.startsWith("//")) {
        exdl = exdl.substring(exdl.indexOf("\n"))
        exdl = exdl.trim()
        console.log(exdl)
    }
    var doc: ExdlDoc = {
        content: []
    }
    var index = 0;
    if (exdl.startsWith("![")) {
        index = exdl.indexOf("]")
        doc.compat = exdl.substring(2,index)
        index++
    }
    doc.content = tokenToDoc(tokenizeTag(exdl.substring(index))).out
    return doc
}

type token = {
    name: string
    value?: string
    meta?: string
}

function tokenizeTag(exdl: string): token[] {
    var tokens: token[] = []
    exdl = exdl.trim()
    while (exdl.startsWith("//")) {
        exdl = exdl.substring(0,exdl.indexOf("\n"))
        exdl = exdl.trim()
    }
    for (let i = 0; i < exdl.length; i++) {
        let str = ""
        let token: token|null = null
        if (exdl.substring(i).startsWith("//")) {
            i += exdl.substring(i).indexOf("\n")
        }
        switch (exdl[i]) {
            case '"':
                for (let j = i+1; j < exdl.length; j++) {
                    if (exdl[j] == '"') break
                    str += exdl[j]
                }
                i += str.length+1
                token = {
                    name: "string",
                    value: str
                }
                break
            case "'":
                for (let j = i+1; j < exdl.length; j++) {
                    if (exdl[j] == "'") break
                    str += exdl[j]
                }
                i += str.length+1
                token = {
                    name: "string",
                    value: str
                }
                break
            case "{":
                token = {
                    name: "open"
                }
                break
            case "}":
                token = {
                    name: "close"
                }
                break
            case " ":
            case "\n":
                break
            default:
                var meta = ""
                for (let j = i; j < exdl.length; j++) {
                    if (exdl[j] == " " || exdl[j] == "\n") break
                    if (exdl[j] == "(") {
                        let str2 = ""
                        for (let k = j+1; k < exdl.length; k++) {
                            if (exdl[k] == ")") break
                            if (exdl[k] == '"') {
                                let str3 = ""
                                for (; k < exdl.length; k++) {
                                    if (exdl[k] == '"') break
                                    str3 += exdl[k]
                                }
                                str2 += str3
                            }
                            str2 += exdl[k]
                        }
                        meta = str2
                        break;
                    }
                    str += exdl[j]
                }
                i += str.length + (meta.length > 0? meta.length+1: 0)
                if (str.endsWith(";")) token = {
                    name: "selfclose2",
                    value: str.substring(0,str.length-1),
                    meta
                }; else if (str.startsWith("!")) token = {
                    name: "selfclose1",
                    value: str.substring(1),
                    meta
                }; else token = {
                    name: "tag",
                    value: str,
                    meta
                }
                break
        }
        if (!!token) tokens.push(token)
    }
    
    return tokens
}

function tokenToDoc(tokens: token[], i: number = 0): {
    out: (ExdlTag|string)[],
    i: number
} {
    var out: (ExdlTag|string)[] = []

    for (; i < tokens.length; i++) {
        switch (tokens[i].name) {
            case "tag":
                var name = tokens[i].value!
                if (tokens[i+1].name == "string")
                    out.push({
                        name,
                        selfClose: SelfCloseType.NONE,
                        content: [tokens[++i].value!],
                        meta: tokens[i].meta
                    })
                else {
                    var out2 = tokenToDoc(tokens, i+1)
                    out.push({
                        name,
                        selfClose: SelfCloseType.NONE,
                        content: out2.out,
                        meta: tokens[i].meta
                    })
                    i = out2.i
                }
                break
            case "selfclose1":
                out.push({
                    name: tokens[i].value!,
                    selfClose: SelfCloseType.NORMAL,
                    meta: tokens[i].meta
                })
                break
            case "selfclose2":
                out.push({
                    name: tokens[i].value!,
                    selfClose: SelfCloseType.NO_SLASH,
                    meta: tokens[i].meta
                })
                break
            case "string":
                out.push(tokens[i].value!)
                break
            case "close":
                return {
                    out,
                    i: i
                }
        }
    }

    return {
        out,
        i
    }
}