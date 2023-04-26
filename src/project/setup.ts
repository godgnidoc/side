import { Feature } from "@godgnidoc/decli"
import { invokeHook } from "../common/invoke_hook"
import { projectDraftFeature } from "./draft"
import { fullyInflateEnv, getFinalSettings, getFinalTarget, projectPath, rpaths } from "../environment"
import { getTargetList } from "../target"
import { ProjectFinalTarget } from "../format"
import { dirname, join } from "path"
import { access, mkdir, readdir } from "fs/promises"
import { promisify } from "util"
import { exec } from "child_process"
import { setStage } from "../stage"

export const projectSetupFeature = new class extends Feature {
    args = true
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

        const all = await getTargetList()
        if (infer) return all.filter(t => t.startsWith(infer))
        return all
    }

    async entry(...args: string[]): Promise<number> {
        if (args.length > 1) {
            console.error('Too many arguments, only one target is allowed')
            return 1
        }
        
        /** 若有必要，尝试切换目标 */
        if (args[0]) {
            console.debug('setup: switching target to', args[0])
            const ret = await projectDraftFeature.entry(args[0])
            if (ret !== 0) return ret
            fullyInflateEnv()
        }
        
        /** 获取最终目标 */
        const target = getFinalTarget()
        console.debug('setup: %s', target.target)
        if (!target) {
            console.error('No target specified')
            return 1
        }

        /** 执行前置钩子 */
        if (0 !== (await invokeHook('pre-setup'))) return 1

        /** 部署层叠资源 */
        if (0 !== (await this.deployCascadingResources(target))) return 1

        /** 安装依赖 */
        if (0 !== (await this.installDependencies(target))) return 1

        /** 获取子模块 */
        if (0 !== (await this.fetchSubmodules(target))) return 1

        /** 执行后置钩子 */
        if (0 !== (await invokeHook('post-setup'))) return 1

        // 设置项目状态
        setStage('ready')
        return 0
    }

    async deployCascadingResources(target: ProjectFinalTarget) {
        if (!target.resources) return 0

        for (const category in target.resources) {
            const resources = target.resources[category]
            const usings = resources.using
            if (!usings || usings.length == 0) continue
            console.debug('setup: deploying cascading resources %s: %s', category, usings.join(', '))

            const src = resources.src
                ? join(projectPath, resources.src)
                : join(projectPath, rpaths.projectResources, category)
            console.debug('setup: -> src: %s', src)

            const dst = resources.dst
                ? join(projectPath, resources.dst)
                : join(projectPath, category)
            console.debug('setup: -> dst: %s', dst)

            const stg = resources.deploy || 'copy'
            console.debug('setup: -> deploy: %s', stg)

            const cln = resources.clean || 'auto'
            console.debug('setup: -> clean: %s', cln)

            // 清理目标目录
            switch (cln) {
                case 'auto': {
                    // 搜集所有可能需要删除的文件
                    const entries = new Set<string>
                    for (const entry of await readdir(src, { withFileTypes: true })) {
                        if (entry.isDirectory()) {
                            const nodes = await readdir(join(src, entry.name))
                            nodes.forEach(n => entries.add(n))
                        }
                    }

                    // 删除所有可能需要删除的文件
                    const cmd = `env -C ${dst} rm -rf ${[...entries].join(' ')}`
                    console.debug('setup: cleaning files in %s: %s', dst, cmd)
                    await promisify(exec)(cmd, { cwd: dst })
                } break
                case 'all': {
                    // 删除所有文件
                    console.debug('setup: cleaning all files in %s', dst)
                    await promisify(exec)(`rm -rf ${dst}`)
                } break
                case 'never': break
                default: {
                    console.error('Unknown clean strategy: %s', cln)
                    return 1
                }
            }

            // 按需创建目标路径
            await mkdir(dst, { recursive: true })

            // 部署资源
            for (const using of usings) {
                switch (stg) {
                    case 'copy': {
                        console.debug('setup: copying %s to %s', join(src, using), dst)
                        await promisify(exec)(`cp -r ${join(src, using)}/* ${dst}/.`)
                    } break
                    case 'slink': {
                        // 定位源路径下所有的文件
                        const files = (await promisify(exec)(`find ${join(src, using)} -type f -printf "%P\n"`))
                            .stdout.split('\n')
                        for (const file of files) {
                            console.debug('setup: creating symlink %s to %s', join(dst, file), join(src, using, file))
                            await mkdir(dirname(join(dst, file)), { recursive: true })
                            await promisify(exec)(`ln -rsf ${join(src, using, file)} ${join(dst, file)}`)
                        }
                    } break
                    default: {
                        console.error('Unknown deploy strategy: %s', stg)
                        return 1
                    }
                }
            }
        }

        console.debug('setup: cascading resources deployed')
        return 0
    }

    async installDependencies(_target: ProjectFinalTarget) {
        // TODO
        console.warn('setup: dependency installation is not implemented yet')
        return 0
    }

    async fetchSubmodules(target: ProjectFinalTarget) {
        const modules = target.modules
        if (!modules) return 0

        const settings = getFinalSettings()
        for (const name in modules) {
            const module = modules[name]

            // 按需创建子模块目录
            await mkdir(join(projectPath, settings.dir.module), { recursive: true })
            const mpath = join(projectPath, settings.dir.module, name) // 子模块路径

            // 获取子模块仓库
            try {
                await access(mpath)
            } catch {
                await promisify(exec)(`git clone ${module.repo} ${mpath}`)
            }

            // 将子仓库更新到最新
            await promisify(exec)(`git pull`, { cwd: mpath })

            // 切换到指定分支
            if (module.checkout) {
                await promisify(exec)(`git checkout ${module.checkout}`, { cwd: mpath })
            }
        }

        return 0
    }
}