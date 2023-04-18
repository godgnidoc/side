import { Feature } from '@godgnidoc/decli'
import { globalOptions } from '../options'
import { isAbsolute, join, resolve } from 'path'
import { access, mkdir } from 'fs/promises'

export class ProjectInitFeature extends Feature {
    brief = 'Initialize a new project'
    description = 'Create new project directory and initialize it with default files'
    args = true

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
            console.error('Target directory already exists')
            return 1
        } catch {
            // pass
        }

        await mkdir(join(target, '.project', 'targets'), { recursive: true })
        await mkdir(join(target, '.project', 'scripts'), { recursive: true })
        await mkdir(join(target, '.project', 'resources'), { recursive: true })

        return 0
    }
}