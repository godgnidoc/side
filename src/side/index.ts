import { Application, defaultCompleteFeature, defaultHelpFeature } from '@godgnidoc/decli'
import { projectFeatures } from './project'
import { SetLogLevel } from 'logging'
import { SidePlatform } from 'platform'
import { notionFeatures } from './notion'
import { invokeHookFeature } from './invoke'
import { shellFeature } from './shell'
import { sideEnvFeatures } from './env'
import { distModule } from './dist'

export class Side implements Application {
    name = 'side'
    version = SidePlatform.version
    brief = 'Smooth Integration Development Environment'
    description = 'Create, build, test and release your project with ease.'
    options = SidePlatform.options
    help = 'help'

    elements = {
        'complete': defaultCompleteFeature,
        'help': defaultHelpFeature,
        '--help': defaultHelpFeature,
        '-h': defaultHelpFeature,
        'version': SidePlatform.featureVersion,
        '--version': SidePlatform.featureVersion,
        '-v': SidePlatform.featureVersion,

        dist: distModule,
        invoke: invokeHookFeature,
        shell: shellFeature,
        env: sideEnvFeatures,
        ...notionFeatures,
        ...projectFeatures,
    }

    entry() {
        SetLogLevel(this.options.logging)
        return 0
    }
}