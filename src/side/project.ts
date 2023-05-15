import { Brief, Feature, LongOpt } from "@godgnidoc/decli"
import { Project } from "project"

class ProjectInitFeature extends Feature {
    args = '[target-path]'
    brief = 'Initialize a new project'
    description = 'Create new project directory and initialize it with default files'

    @LongOpt('--force')
    @Brief('Overwrite existing project')
    force = false

    async entry(...args: string[]): Promise<number> {
        if (args.length > 1) {
            console.error('Too many arguments, only one target directory is allowed')
            return 1
        }
        await Project.Create(args[0] || process.cwd(), this.force)
        return 0
    }
}

const projectInitFeature = new ProjectInitFeature()

const projectDraftFeature = new class extends Feature {
    args = '<target>'
    brief = 'Draft a new project'
    description = 'Take a target and calculate the final target'

    complete = async (editing: boolean, args: string[]) => {
        if (args.length > 1) return []
        const infer = editing ? args[0] : ''

        const all = await Project.This()?.listTargets() ?? []
        if (infer) return all.filter(t => t.startsWith(infer))
        return all
    }

    async entry(...args: string[]) {
        console.debug('draft: %s', args.join(' '))
        if (args.length !== 1)
            return console.error('This feature requires exactly one argument'), 1

        /** 获取项目 */
        if (!Project.This()) {
            return console.error('This feature requires a project'), 1
        }

        /** 计算目标 */
        const target = args[0]
        await Project.This().draft(target)

        return 0
    }
}

const projectSetupFeature = new class extends Feature {
    args = '[target]'
    brief = 'Setup a project'
    description = 'Setup the project against the current target\n\n'
        + '  1. Invoke pre-setup scripts\n'
        + '  2. Delpoy cascading resources\n'
        + '  3. Install dependencies\n'
        + '  4. Fetch submodule repositories\n'
        + '  5. Invoke post-setup scripts\n\n'
        + 'Optionally, you can specify a target to setup against, otherwise the current target will be used'

    complete = async (editing: boolean, args: string[]) => {
        if (args.length > 1) return []
        const infer = editing ? args[0] : ''

        const all = await Project.This()?.listTargets() ?? []
        if (infer) return all.filter(t => t.startsWith(infer))
        return all
    }

    async entry(...args: string[]): Promise<number> {
        if (args.length > 1) {
            console.error('Too many arguments, only one target is allowed')
            return 1
        }

        if (!Project.This()) {
            console.error('This feature requires a project')
            return 1
        }

        /** 若有必要，尝试切换目标 */
        if (args[0]) {
            console.debug('setup: switching target to', args[0])
            await Project.This().draft(args[0])
            await Project.Open(Project.This().path).setup()
        } else {
            await Project.This().setup()
        }

        return 0
    }
}

const projectBuildFeature = new class extends Feature {
    args = true
    brief = 'Build project'
    description = 'Build project'

    async entry(...args: string[]): Promise<number> {
        if (!Project.This()) {
            console.error('This feature requires a project')
            return 1
        }
        await Project.This().build(...args)
        return 0
    }
}

const projectPackageFeature = new class extends Feature {
    brief = 'Package project'
    description = 'Package project'

    async entry(): Promise<number> {
        if (!Project.This()) {
            console.error('This feature requires a project')
            return 1
        }
        await Project.This().package()
        return 0
    }
}

export const projectFeatures = {
    init: projectInitFeature,
    draft: projectDraftFeature,
    setup: projectSetupFeature,
    build: projectBuildFeature,
    package: projectPackageFeature
}