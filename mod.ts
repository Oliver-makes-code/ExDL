import * as parser from "./src/ExDLParser.ts"
const exdl = await Deno.readTextFile("./test.exdl")
console.log(parser.parse(exdl))