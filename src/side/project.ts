import { Args, Brief, Feature, LongOpt, Repeat, ShortOpt } from '@godgnidoc/decli'
import { FileDB, TargetDepLock } from 'format'
import { access, rm } from 'fs/promises'
import { join } from 'path'
import { PROJECT, Project } from 'project'

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
        console.verbose('draft: %s', args.join(' '))
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

class ProjectSetupFeature extends Feature {
    args = '[target]'
    brief = 'Setup a project'
    description = 'Setup the project against the current target\n\n'
        + '  1. Invoke pre-setup scripts\n'
        + '  2. Delpoy cascading resources\n'
        + '  3. Install dependencies\n'
        + '  4. Fetch submodule repositories\n'
        + '  5. Invoke post-setup scripts\n\n'
        + 'Optionally, you can specify a target to setup against, otherwise the current target will be used'

    @ShortOpt('-u') @LongOpt('--unlock')
    @Brief('Unlock dependencies')
    unlock = false

    @ShortOpt('-U') @LongOpt('--update')
    @Brief('Update specified dependency')
    @Args(_ => true)
    @Repeat()
    update: string[] = []

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

        let project = Project.This()

        /** 若有必要，尝试切换目标 */
        if (args[0]) {
            console.verbose('setup: switching target to', args[0])
            await project.draft(args[0])
            project = Project.Open(project.path)
        }

        /** 若有必要，解锁依赖 */
        try {
            const deplockPath = join(project.path, PROJECT.RPATH.DEPLOCKS, project.target.target)
            await access(deplockPath)
            if (this.unlock) {
                console.verbose('setup: unlocking dependencies')
                await rm(deplockPath)
            } else if (this.update.length) {
                console.verbose('setup: unlock dependencies for update')
                const depLock = await FileDB.Open<TargetDepLock>(deplockPath, {
                    format: 'json',
                    schema: 'TargetDepLock'
                })
                for (const dep of this.update) {
                    console.verbose('setup: unlocking dependency', dep)
                    delete depLock[dep]
                }
            }
        } catch {
            console.verbose('setup: no dependency lock found')
        }

        await project.setup()
        return 0
    }
}
const projectSetupFeature = new ProjectSetupFeature

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

const projectCleanFeature = new class extends Feature {
    brief = 'Clean project'
    description = 'Clean project'

    async entry(): Promise<number> {
        if (!Project.This()) {
            console.error('This feature requires a project')
            return 1
        }

        await Project.This().clean()
        return 0
    }
}

const projectDictateFeature = new class extends Feature {
    args = '[targets...]'

    brief = 'Dictate target dependencies'
    description = 'Dictate project dependencies into a file, which could be used to grab dependencies later'

    async entry(...targets: string[]): Promise<number> {
        if (!Project.This()) {
            console.error('This feature requires a project')
            return 1
        }

        const dictate = await Project.This().dictate(targets)
        console.log(JSON.stringify(dictate, null, 2))
        return 0
    }
}

export const projectFeatures = {
    init: projectInitFeature,
    draft: projectDraftFeature,
    setup: projectSetupFeature,
    build: projectBuildFeature,
    package: projectPackageFeature,
    clean: projectCleanFeature,
    dictate: projectDictateFeature,
}