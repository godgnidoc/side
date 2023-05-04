import { Feature } from "@godgnidoc/decli"
import { calculateTarget, getTargetList } from "../target"
import * as yaml from 'js-yaml'
import { join } from "path"
import { getFinalSettings, projectManifest, projectName, projectPath, rpaths, sideVersion } from "environment"
import { ProjectFinalTarget, ProjectManifest } from "format"
import { readFile, writeFile } from "fs/promises"
import { vmerge } from "../common"
import { promisify } from "util"
import { exec } from "child_process"

export const projectDraftFeature = new class extends Feature {
    args = '<target>'
    brief = 'Draft a new project'
    description = 'Take a target and calculate the final target'

    complete = async (editing: boolean, args: string[]) => {
        if (args.length > 1) return []
        const infer = editing ? args[0] : ''

        const all = await getTargetList()
        if (infer) return all.filter(t => t.startsWith(infer))
        return all
    }

    async entry(...args: string[]) {
        console.debug('draft: %s', args.join(' '))
        if (args.length !== 1)
            return console.error('This feature requires exactly one argument'), 1

        if (!projectPath)
            return console.error('This feature requires a project'), 1

        /** 计算目标 */
        const target = args[0]
        const targets = await calculateTarget(target)
        if (!targets) return console.error('Failed to calculate target'), 1
        console.debug('draft: target: %s', targets.join(' '))

        let final: ProjectFinalTarget = {
            $structure: 'side.final-target',
            project: projectName,
            target: target,
            engine: sideVersion,
            stage: 'draft'
        }

        /** 尝试加载项目根清单 */
        try {
            console.debug('draft: load project manifest')
            const manifest = { ...projectManifest }
            delete manifest['$structure']
            delete manifest['project']
            delete manifest['target']
            delete manifest['engine']
            delete manifest['dirs']
            delete manifest['stage']
            final = vmerge(final, manifest)
        } catch {
            console.error('Failed to load project manifest')
            return 1
        }

        /** 尝试加载项目目标清单 */
        for (const target of targets) {
            try {
                console.debug('draft: load project target/aspect %s', target)
                const source = await readFile(target, 'utf-8')
                const manifest = yaml.load(source) as ProjectManifest
                delete manifest['$structure']
                delete manifest['project']
                delete manifest['target']
                delete manifest['engine']
                delete manifest['dirs']
                delete manifest['inherit']
                delete manifest['composites']
                delete manifest['stage']
                final = vmerge(final, manifest)
            } catch (e) {
                console.error('Failed to load project target/aspect %s:', target, e.message)
                return 1
            }
        }

        /** 获取git中登记的邮箱 */
        let email = ''
        try {
            email = (await promisify(exec)('git config user.email')).stdout.trim()
            console.debug('draft: git user email: %s', email)
        } catch {
            console.warn('Failed to get git user email, module filter may not work')
        }

        /** 整理子仓库，过滤掉不需要的仓库，并根据本地配置修正检出目标 */
        if (final.modules) {
            console.debug('draft: filter modules')
            const settings = getFinalSettings()
            const filter: string[] = []
            for (const name in final.modules) {
                const module = final.modules[name]
                let fetch = true
                if (email && module.authors) fetch = fetch && module.authors.includes(email)
                if (name in settings.modules) {
                    const setting = settings.modules[name]
                    if (typeof setting.fetch === 'boolean') fetch = setting.fetch
                    if (typeof setting.checkout === 'string') module.checkout = setting.checkout
                }
                if (!fetch) filter.push(name)
            }
            for (const name of filter) delete final.modules[name]
        }

        /** 写入最终目标清单 */
        await writeFile(join(projectPath, rpaths.projectFinalTarget), yaml.dump(final))
        console.debug('draft: final target written')
        return 0
    }
}