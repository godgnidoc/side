import { Application, defaultCompleteFeature, defaultHelpFeature } from '@godgnidoc/decli'
import { SetLogLevel } from 'logging'
import { distServeFeature } from './server'
import { SidePlatform } from 'platform'

export class DistServer implements Application {
    name = 'dist-server'
    version = SidePlatform.version
    brief = 'Distributed Package Manager'
    description = 'This program is part of the side project.'
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

        'serve': distServeFeature
    }

    entry() {
        SetLogLevel(this.options.logging)
        return 0
    }
}