import * as parser from "./src/ExDLParser.ts"
const exdl = await Deno.readTextFile("./test.exdl")
parser.parse(exdl)