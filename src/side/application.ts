import { Application, defaultCompleteFeature, defaultHelpFeature } from "@godgnidoc/decli"
import { globalOptions, sideVersion } from "../environment"
import { common } from "../common"
import { project } from "../project"
import { SetLogLevel } from "../logging"
import { target } from '../target'
import { dist } from '../dist'

export class Side implements Application {
    name = "side"
    version = sideVersion
    brief = "Smooth Integration Development Environment"
    description = "Create, build, test and release your project with ease."
    options = globalOptions
    help = 'help'

    elements = {
        "complete": defaultCompleteFeature,
        "help": defaultHelpFeature,
        "--help": defaultHelpFeature,
        "-h": defaultHelpFeature,

        ...common,
        ...project,

        target,
        dist,
    }

    entry() {
        SetLogLevel(this.options.logging)
        return 0
    }
}