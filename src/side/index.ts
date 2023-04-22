import { execute } from "@godgnidoc/decli"
import { Side } from "./application"
import { InitiateEnvironment } from "./initiate"
import { InitiateLogging } from "../logging"

export async function main() {
    InitiateLogging()
    InitiateEnvironment()
    
    const app = new Side()
    const args = process.argv.slice(2)
    try {
        const ret = await execute(app, args)
        process.exit(ret)
    } catch(err) {
        console.error(err)
        process.exit(-1)
    }
}