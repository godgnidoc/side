import { distLoginFeature } from './client/user/login'
import { userCreateFeature } from './client/user/create'
import { userMeFeature } from './client/user/me'
import { distServeFeature } from './server'
import { distPackFeature } from './client/package/pack'
import { Application, defaultCompleteFeature, defaultHelpFeature } from '@godgnidoc/decli'
import { globalOptions, sideVersion } from 'environment'
import { SetLogLevel } from 'logging'

export class Dist implements Application {
    name = "dist"
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

        serve: distServeFeature,
        login: distLoginFeature,
        me: userMeFeature,
        create: {
            user: userCreateFeature,
        },
        pack: distPackFeature,
    }

    entry() {
        SetLogLevel(this.options.logging)
        return 0
    }
}