import { Brief, Feature, LongOpt } from '@godgnidoc/decli'
import { globalOptions } from '../options'
import { isAbsolute, join, resolve } from 'path'
import { access, mkdir, rmdir } from 'fs/promises'

export class ProjectInitFeature extends Feature {
    brief = 'Initialize a new project'
    description = 'Create new project directory and initialize it with default files'
    args = true

    @LongOpt('--force')
    @Brief('Overwrite existing project')
    force = false

    async entry(...args: string[]): Promise<number> {
        if( args.length > 1 ) {
            console.error('Too many arguments')
            return 1
        }
        const arg0 = args[0]
        const target = arg0 === undefined
            ? globalOptions.workspace
            : isAbsolute(arg0)
                ? arg0
                : resolve(globalOptions.workspace, arg0)

        console.info('Initializing project in %s', target)

        try {
            await access(join(target, '.project'))
            if( !this.force) {
                console.error('Target directory is an existing project, add --force to overwrite it')
                return 1
            }

            console.warn('Target directory is an existing project, overwriting it')
            await rmdir(join(target, '.project'), { recursive: true })
        } catch {
            // pass
        }

        await mkdir(join(target, '.project', 'targets'), { recursive: true })
        await mkdir(join(target, '.project', 'scripts'), { recursive: true })
        await mkdir(join(target, '.project', 'resources'), { recursive: true })

        return 0
    }
}