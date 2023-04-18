import { exit } from "process"
import { Application, defaultCompleteFeature, defaultHelpFeature, execute } from "@godgnidoc/decli"
import { globalOptions } from "./options"
import { project } from "./project"
import { SetLogLevel } from "./logging"

class Side implements Application {
    name = "side"
    version = "1.0.0"
    brief = "Smooth Integration Development Environment"
    description = "Create, build, test and release your project with ease."
    options = globalOptions
    help = 'help'

    elements = {
        "complete": defaultCompleteFeature,
        "help": defaultHelpFeature,
        "--help": defaultHelpFeature,
        "-h": defaultHelpFeature,

        ...project
    }

    entry() {
        SetLogLevel(globalOptions.logging)
        return 0
    }
}

const app = new Side()
execute(app, process.argv.slice(2)).then((ret) => {
    exit(ret)
}).catch((err) => {
    console.error(err)
    exit(-1)
})