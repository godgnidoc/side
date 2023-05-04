import { distLoginFeature } from './user/login'
import { userCreateFeature } from './user/create'
import { userMeFeature } from './user/me'
import { distPackFeature } from './package/pack'
import { Application, defaultCompleteFeature, defaultHelpFeature } from '@godgnidoc/decli'
import { globalOptions, sideVersion } from 'environment'
import { SetLogLevel } from 'logging'
import { versionFeature } from 'commons/version'
import { scopeCreateFeature } from './scope/create'
import { repoCreateFeature } from './repo/create'
import { distPublishFeature } from './package/publish'

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
        'version': versionFeature,
        '--version': versionFeature,
        '-v': versionFeature,

        login: distLoginFeature,
        me: userMeFeature,
        create: {
            user: userCreateFeature,
            scope: scopeCreateFeature,
            repo: repoCreateFeature
        },
        pack: distPackFeature,
        publish: distPublishFeature
    }

    entry() {
        SetLogLevel(this.options.logging)
        return 0
    }
}