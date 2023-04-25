import { join } from "path"
import { getRevision } from "../common"
import { invokeHook } from "../common/invoke_hook"
import { getFinalSettings, getFinalTarget, projectName, projectPath } from "../environment"
import { ProjectBuildInfo, ProjectFinalTarget } from "../format"
import { projectSetupFeature } from "./setup"
import { writeFile } from "fs/promises"
import { Feature } from "@godgnidoc/decli"
import { setStage, testStage } from "../stage"

export const projectBuildFeature = new class extends Feature {
    args = true
    brief = 'Build project'
    description = 'Build project'

    async entry(...args: string[]): Promise<number> {
        console.debug('build:', args)
        const target = getFinalTarget()
        if (!target) {
            console.error('No target specified')
            return 1
        }
        if (testStage('built')) {
            if (0 !== await projectSetupFeature.entry()) return 1
        }

        if (0 !== await invokeHook('pre-build', args)) return 1
        await this.generateBuildInfo(target)
        if (0 !== await invokeHook('build', args)) return 1
        if (0 !== await invokeHook('post-build', args)) return 1

        setStage('built')
        return 0
    }

    async generateBuildInfo(target: ProjectFinalTarget) {
        console.debug('build: generating build info')
        const settings = getFinalSettings()

        const requires = []
        if (target.requires) Object.entries(target.requires)
            .map(([name, version]) => name + '-' + version)

        const modules = {}
        if (target.modules) for (const [name, module] of Object.entries(target.modules)) {
            modules[module.repo] = await getRevision(join(projectPath, settings.dir.module, name), { dirty: true })
        }

        const resources = {}
        if (target.resources) for (const [category, resource] of Object.entries(target.resources)) {
            resources[category] = [...resource.using]
        }

        const info: ProjectBuildInfo = {
            $structure: 'side.build-info',
            project: projectName,
            revision: await getRevision(projectPath, { dirty: true }),
            target: target.target,
            engine: target.engine,
            requires: requires,
            modules: modules,
            resources: resources,
            exports: target.exports
        }

        await writeFile(join(projectPath, settings.dir.build, 'build-info.json'), JSON.stringify(info, null, 4))

        return 0
    }
}