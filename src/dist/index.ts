import { distLoginFeature } from './user/login'
import { userCreateFeature } from './user/create'
import { userMeFeature } from './user/me'
import { distPackFeature } from './package/pack'
import { Application, defaultCompleteFeature, defaultHelpFeature } from '@godgnidoc/decli'
import { SetLogLevel } from 'logging'
import { scopeCreateFeature } from './scope/create'
import { repoCreateFeature } from './repo/create'
import { distPublishFeature } from './package/publish'
import { distSearchFeature } from './package/search'
import { distReposFeature } from './repo/repos'
import { distScopesFeature } from './scope/scopes'
import { distQueryFeature } from './package/query'
import { distGetFeature } from './package/get'
import { distRmFeature } from './package/rm'
import { SidePlatform } from 'platform'
import { distInstallFeature } from './package/install'

export class Dist implements Application {
    name = "dist"
    version = SidePlatform.version
    brief = "Distributed Package Manager"
    description = "This program is part of the side project."
    options = SidePlatform.options
    help = 'help'

    elements = {
        "complete": defaultCompleteFeature,
        "help": defaultHelpFeature,
        "--help": defaultHelpFeature,
        "-h": defaultHelpFeature,
        'version': SidePlatform.featureVersion,
        '--version': SidePlatform.featureVersion,
        '-v': SidePlatform.featureVersion,

        login: distLoginFeature,
        me: userMeFeature,

        create: {
            user: userCreateFeature,
            scope: scopeCreateFeature,
            repo: repoCreateFeature
        },
        pack: distPackFeature,
        publish: distPublishFeature,

        query: distQueryFeature,
        ls: distSearchFeature,
        packages: distSearchFeature,
        repos: distReposFeature,
        scopes: distScopesFeature,

        get: distGetFeature,
        install: distInstallFeature,
        rm: distRmFeature
    }

    entry() {
        SetLogLevel(this.options.logging)
        return 0
    }
}