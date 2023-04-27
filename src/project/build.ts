import { join } from "path"
import { getRevision } from "../common"
import { invokeHook } from "../common/invoke_hook"
import { loadFinalTarget, projectManifest, projectName, projectPath } from "../environment"
import { ProjectBuildInfo } from "../format"
import { projectSetupFeature } from "./setup"
import { writeFile } from "fs/promises"
import { Feature } from "@godgnidoc/decli"
import { setStage, testStage } from "../stage"
import { PackageId } from "../dist/utils"

export const projectBuildFeature = new class extends Feature {
    args = true
    brief = 'Build project'
    description = 'Build project'

    async entry(...args: string[]): Promise<number> {
        console.debug('build:', args)
        if (!loadFinalTarget()) {
            console.error('No target specified')
            return 1
        }
        if (!testStage('ready')) {
            if (0 !== await projectSetupFeature.entry()) return 1
        }

        if (0 !== await invokeHook('pre-build', args)) return 1
        await this.generateBuildInfo()
        if (0 !== await invokeHook('build', args)) return 1
        if (0 !== await invokeHook('post-build', args)) return 1

        setStage('built')
        return 0
    }

    async generateBuildInfo() {
        console.debug('build: generating build info')
        const target = loadFinalTarget()

        let requires: string[]
        if (target.requires) requires = Object.entries(target.requires)
            .map(([name, version]) => PackageId.Parse(name, version).toString())

        let modules: { [repo: string]: string }
        if (target.modules) for (const [name, module] of Object.entries(target.modules)) {
            if (!modules) modules = {}
            modules[module.repo] = await getRevision(join(projectPath, projectManifest.dirs.module, name), { dirty: true })
        }

        let resources: { [category: string]: string[] }
        if (target.resources) for (const [category, resource] of Object.entries(target.resources)) {
            if (!resources) resources = {}
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

        await writeFile(join(projectPath, projectManifest.dirs.build, 'build-info.json'), JSON.stringify(info, null, 4))

        return 0
    }
}