import { Application, defaultCompleteFeature, defaultHelpFeature } from '@godgnidoc/decli'
import { globalOptions, sideVersion } from 'environment'
import { SetLogLevel } from 'logging'
import { distServeFeature } from './server'
import { versionFeature } from 'commons/version'

export class DistServer implements Application {
    name = "dist-server"
    version = sideVersion
    brief = "Distributed Package Manager"
    description = "This program is part of the side project."
    options = globalOptions
    help = 'help'

    elements = {
        "complete": defaultCompleteFeature,
        "help": defaultHelpFeature,
        "--help": defaultHelpFeature,
        "-h": defaultHelpFeature,
        'version': versionFeature,
        '--version': versionFeature,
        '-v': versionFeature,

        "serve": distServeFeature
    }

    entry() {
        SetLogLevel(this.options.logging)
        return 0
    }
}