import { FileDB, LocalSettings, PackageId, DepLock, ProjectAspect, ProjectBuildInfo, ProjectFinalTarget, ProjectManifest, ProjectTarget, Stage, loadYamlSync, Dictate, loadJson, Cache, loadYaml, Requires } from 'format'
import { mkdir, readFile, readdir, rmdir, writeFile } from 'fs/promises'
import { basename, dirname, join, relative, resolve } from 'path'
import { promisify } from 'util'
import { SpawnOptionsWithoutStdio, exec, spawn } from 'child_process'
import { readFileSync, statSync } from 'fs'
import { dump } from 'js-yaml'
import { SidePlatform } from 'platform'
import { vmerge } from 'notion'
import { getRevision, invokeHook } from 'side/common'
import * as yaml from 'js-yaml'
import { ActivatePackage, DeactivatePackage, QueryPackage } from './disting'
import { PROJECT } from 'project.path'
import { Find, IsExist } from 'filesystem'

/** 导出静态定义 */
export { PROJECT } from './project.path'

/** 用于管理项目的抽象 */
export class Project {
    get name() { return this.manifest.project }

    get stage() { return this.target?.stage }
    set stage(value: Stage) { if (this.target) this.target.stage = value }
    satisifyStage(stage: Stage) {
        if (!this.stage) return false
        const order: Stage[] = ['draft', 'ready', 'built', 'packaged']
        const oc = order.indexOf(this.stage)
        const os = order.indexOf(stage)
        const op = oc > os
            ? '>'
            : oc < os
                ? '<'
                : '=='
        console.verbose('stage: (current) %s %s %s (target)', this.stage, op, stage)
        return oc >= os
    }

    get target() {
        try {
            return FileDB.Open<ProjectFinalTarget>(join(this.path, PROJECT.RPATH.TARGET), {
                format: 'yaml',
                schema: 'ProjectFinalTarget',
            })
        } catch (e) {
            console.verbose('failed to load project target: %s', e.message)
            return undefined
        }
    }

    get settings() {
        try {
            return FileDB.Open<LocalSettings>(join(this.path, PROJECT.RPATH.SETTINGS), {
                format: 'yaml',
                schema: 'LocalSettings',
            })
        } catch (e) {
            console.verbose('failed to load project settings: %s', e.message)
            return {} as LocalSettings
        }
    }

    get exports() {
        let basic = vmerge(SidePlatform.exports, {
            SIDE_PROJECT: this.path,
            SIDE_PROJECT_TARGET: this.target?.target,
            SIDE_PROJECT_NAME: this.name,
            SIDE_PROJECT_META: join(this.path, PROJECT.RPATH.META),
            SIDE_PROJECT_SYSROOT: join(this.path, PROJECT.RPATH.SYSROOT),
            SIDE_DIR_MODULE: this.manifest.dirs.MODULE,
            SIDE_DIR_BUILD: this.manifest.dirs.BUILD,
            SIDE_DIR_DOCUMENT: this.manifest.dirs.DOCUMENT,
            SIDE_DIR_GENERATED: this.manifest.dirs.GENERATED,
            SIDE_DIR_PACKAGE: this.manifest.dirs.PACKAGE,
            SIDE_DIR_RELEASE: this.manifest.dirs.RELEASE,
            NODE_PATH: [
                join(this.path, PROJECT.RPATH.SYSROOT, 'lib', 'node_modules'),
                join(this.path, PROJECT.RPATH.SYSROOT, 'usr', 'lib', 'node_modules'),
            ],
            LD_LIBRARY_PATH: [
                join(this.path, PROJECT.RPATH.SYSROOT, 'lib64'),
                join(this.path, PROJECT.RPATH.SYSROOT, 'lib'),
                join(this.path, PROJECT.RPATH.SYSROOT, 'lib', 'x86_64-linux-gnu'),
                join(this.path, PROJECT.RPATH.SYSROOT, 'usr', 'lib64'),
                join(this.path, PROJECT.RPATH.SYSROOT, 'usr', 'lib'),
                join(this.path, PROJECT.RPATH.SYSROOT, 'usr', 'lib', 'x86_64-linux-gnu'),
            ],
            PATH: [
                join(this.path, PROJECT.RPATH.SYSROOT, 'bin'),
                join(this.path, PROJECT.RPATH.SYSROOT, 'sbin'),
                join(this.path, PROJECT.RPATH.SYSROOT, 'usr', 'bin'),
                join(this.path, PROJECT.RPATH.SYSROOT, 'usr', 'sbin'),
            ]
        })
        try {
            const source = readFileSync(join(this.path, PROJECT.RPATH.EXPORTS), 'utf-8')
            basic = vmerge(basic, JSON.parse(source))
        } catch {
            // ignore
        }
        if (this.target?.exports) return vmerge(basic, this.target.exports)
        else if (this.manifest.exports) return vmerge(basic, this.manifest.exports)
        else return basic
    }

    async listTargets() {
        try {
            const list: string[] = []
            const prefix = 'target-'
            for (const file of await readdir(join(this.path, PROJECT.RPATH.TARGETS), { withFileTypes: true })) {
                if (file.isFile() && file.name.startsWith(prefix))
                    list.push(file.name.slice(prefix.length))
            }
            return list
        } catch (e) {
            console.verbose('Failed to list target', e)
            return []
        }
    }

    async dictate(targets: string[]) {
        if (targets.length === 0) targets = await this.listTargets()

        /** 计算全部依赖 */
        let dependencies: string[] = []

        const deplock = await loadYaml<DepLock>(join(this.path, PROJECT.RPATH.DEPLOCK), 'DepLock')

        for (const targetName of targets) {
            if (!(targetName in deplock)) continue
            const lock = deplock[targetName]

            for (const query in lock) {
                const packageId = PackageId.FromQuery(query, lock[query].version)
                if (packageId instanceof Error) throw packageId
                const dep = packageId.toString()

                if (!dependencies.includes(dep)) dependencies.push(dep)
            }
        }

        let dictate: Dictate = {}

        try {
            const cache = await loadJson<Cache>(join(SidePlatform.paths.caches, 'index.json'), 'Cache')

            for (const dep of dependencies) {
                if (dep in cache) {
                    dictate[dep] = {
                        mtime: cache[dep].mtime,
                        size: cache[dep].size,
                    }
                } else {
                    dictate[dep] = null
                }
            }
        } catch {
            console.verbose('Failed to load cache index')
            for (const dep of dependencies) {
                dictate[dep] = null
            }
        }

        return dictate
    }

    /** 起草一个目标 */
    async draft(target: string) {
        /** 计算目标 */
        const targets = await this.collectTargets(target)
        if (!targets) throw new Error('Failed to calculate target')

        let final: ProjectFinalTarget = {
            project: this.name,
            target: target,
            engine: SidePlatform.version,
            stage: 'draft'
        }

        /** 尝试加载项目根清单 */
        const manifest = FileDB.Dump(this.manifest)
        console.verbose('draft: load project manifest %o', manifest)
        delete manifest['project']
        delete manifest['target']
        delete manifest['engine']
        // delete manifest['dirs']
        delete manifest['stage']
        final = vmerge(final, manifest)

        /** 尝试加载项目目标清单 */
        for (const target of targets) {
            console.verbose('draft: load target manifest %o', FileDB.Dump(target))
            delete target['project']
            delete target['target']
            delete target['engine']
            // delete target['dirs']
            delete target['inherit']
            delete target['composites']
            delete target['stage']
            final = vmerge(final, target)
        }

        /** 获取git中登记的邮箱 */
        let email = ''
        try {
            email = (await promisify(exec)('git config user.email')).stdout.trim()
            console.verbose('draft: git user email: %s', email)
        } catch {
            console.warn('Failed to get git user email, module filter may not work')
        }

        /** 整理子仓库，过滤掉不需要的仓库，并根据本地配置修正检出目标 */
        if (final.modules) {
            console.verbose('draft: filter modules')
            const settings = this.settings
            const filter: string[] = []
            for (const name in final.modules) {
                const module = final.modules[name]
                let fetch = true
                if (email && module.authors) fetch = fetch && module.authors.includes(email)
                if (settings.modules && name in settings.modules) {
                    const setting = settings.modules[name]
                    if (typeof setting.fetch === 'boolean') fetch = setting.fetch
                    if (typeof setting.checkout === 'string') module.checkout = setting.checkout
                }
                if (!fetch) filter.push(name)
            }
            for (const name of filter) delete final.modules[name]
        }

        /** 按条件筛选项目依赖 */
        if (final.requires) {
            console.verbose('draft: filter dependencies')
            const filter: string[] = []
            for (const query in final.requires) {
                const version = final.requires[query] as Requires[typeof query]
                if (typeof version === 'string') continue

                const conds = typeof version.condition === 'string'
                    ? [version.condition]
                    : version.condition

                for (const cond of conds) {
                    const res = await invokeHook('cond', [cond], { failOnMissing: true, ignoreError: true })
                    if (res === 0) {
                        final.requires[query] = version.version
                    } else {
                        filter.push(query)
                        console.info('draft: dependency %s filtered out by condition %s', query, cond)
                    }
                }

            }
            for (const name of filter) delete final.requires[name]
        }

        // 清理当前环境
        await this.clean()

        /** 写入最终目标清单 */
        await writeFile(join(this.path, PROJECT.RPATH.TARGET), dump(final))
        FileDB.Update(join(this.path, PROJECT.RPATH.TARGET))
        console.verbose('draft: final target written')
    }

    /** 搭建目标开发环境 */
    async setup() {
        if (!this.target) {
            throw new Error('No target specified')
        }
        console.verbose('setup: %o', FileDB.Dump(this.target))

        /** 执行前置钩子 */
        if (0 !== await invokeHook('pre-setup'))
            throw new Error('Failed to invoke pre-setup hook')

        /** 清理层叠资源 */
        await this.cleanCascadingResources()

        /** 部署层叠资源 */
        await this.deployCascadingResources()

        /** 清理依赖 */
        await this.deactivateDependencies()

        /** 安装依赖 */
        await this.activateDependencies()

        /** 获取子模块 */
        await this.fetchSubmodules()

        /** 执行后置钩子 */
        if (0 !== await invokeHook('post-setup'))
            throw new Error('Failed to invoke post-setup hook')

        // 设置项目状态
        this.target.stage = 'ready'
    }

    async clean() {
        /** 清理层叠资源 */
        await this.cleanCascadingResources()

        /** 清理依赖 */
        await this.deactivateDependencies()

        // 删除汇总目标文件
        await promisify(exec)(`rm -rf ${join(this.path, PROJECT.RPATH.TARGET)}`)
    }

    async build(...args: string[]) {
        console.verbose('build:', args)
        if (!this.target) {
            throw new Error('No target specified')
        }
        if (!this.satisifyStage('ready')) {
            await this.setup()
        }

        if (0 !== await invokeHook('pre-build', args)) throw new Error('Failed to invoke pre-build hook')
        await this.generateBuildInfo()
        if (0 !== await invokeHook('build', args)) throw new Error('Failed to invoke build hook')
        if (0 !== await invokeHook('post-build', args)) throw new Error('Failed to invoke post-build hook')

        if (args.length === 0) {
            this.target.stage = 'built'
        }
        return 0
    }

    async package() {
        const target = this.target
        if (!target) {
            throw new Error('No target specified')
        }
        if (!this.satisifyStage('built')) {
            await this.build()
        }

        if (0 !== await invokeHook('pre-package')) throw new Error('Failed to invoke pre-package hook')
        if (0 !== await invokeHook('package')) throw new Error('Failed to invoke package hook')
        if (0 !== await invokeHook('post-package')) throw new Error('Failed to invoke post-package hook')

        this.target.stage = 'packaged'
    }

    private async generateBuildInfo() {
        console.verbose('build: generating build info')
        const target = this.target

        let requires: string[]
        const lockPath = join(this.path, PROJECT.RPATH.DEPLOCK)
        if (await IsExist(lockPath)) {
            const lock = FileDB.Open<DepLock>(lockPath, { schema: 'DepLock', format: 'yaml' })
            const tlock = lock[target.target]
            if (tlock) {
                for (const query in tlock) {
                    const id = PackageId.FromQuery(query, tlock[query].version).toString()
                    if (!requires) requires = [id]
                    else if (!requires.includes(id)) requires.push(id)
                }
            }
        }

        let modules: { [repo: string]: string }
        if (target.modules) for (const [name, module] of Object.entries(target.modules)) {
            if (!modules) modules = {}
            modules[module.repo] = module.checkout
                + "=>"
                + await getRevision(join(this.path, this.manifest.dirs.MODULE, name), { dirty: true })
        }

        let resources: { [category: string]: string[] }
        if (target.resources) for (const [category, resource] of Object.entries(target.resources)) {
            if (!resources) resources = {}
            resources[category] = [...resource.using]
        }

        const info: ProjectBuildInfo = {
            project: this.name,
            revision: await getRevision(this.path, { dirty: true }),
            target: target.target,
            date: new Date().toLocaleString(),
            engine: target.engine,
            requires: requires,
            modules: modules,
            resources: resources,
            exports: target.exports
        }

        await mkdir(join(this.path, this.manifest.dirs.BUILD), { recursive: true })
        await writeFile(join(this.path, this.manifest.dirs.BUILD, 'build-info.json'), JSON.stringify(info, null, 4))
    }

    private async cleanCascadingResources() {
        const target = this.target
        if (!target?.resources) return

        for (const category in target.resources) {
            const resources = target.resources[category]
            const usings = resources.using
            if (!usings || usings.length == 0) continue
            console.verbose('CRM: clean cascading resources %s: %s', category, usings.join(', '))

            const src = resources.src
                ? join(this.path, resources.src)
                : join(this.path, PROJECT.RPATH.RESOURCES, category)
            console.verbose('CRM: src = %s', src)

            const dst = resources.dst
                ? join(this.path, resources.dst)
                : join(this.path, category)
            console.verbose('CRM: dst = %s', dst)

            const stg = resources.deploy || 'copy'
            console.verbose('CRM: deploy = %s', stg)

            const cln = resources.clean || 'auto'
            console.verbose('CRM: clean = %s', cln)

            // 清理目标目录
            switch (cln) {
                case 'auto': {
                    // 搜集所有可能需要删除的文件
                    const entries = new Set<string>()
                    for (const entry of await readdir(src, { withFileTypes: true })) {
                        if (entry.isDirectory()) {
                            const nodes = await readdir(join(src, entry.name))
                            nodes.forEach(n => entries.add(n))
                        }
                    }

                    // 删除所有可能需要删除的文件
                    if (await IsExist(dst)) {
                        const cmd = `env -C ${dst} rm -rf ${[...entries].join(' ')}`
                        console.verbose('CRM: cleaning files in %s: %s', dst, cmd)
                        await promisify(exec)(cmd, { cwd: dst })
                    } else {
                        console.verbose('CRM: cleaning files in %s: skip non existing folder', dst)
                    }
                } break
                case 'all': {
                    // 删除所有文件
                    console.verbose('CRM: cleaning all files in %s', dst)
                    await promisify(exec)(`rm -rf ${dst}`)
                } break
                case 'never': break
                default: {
                    throw new Error('Unknown clean strategy: %s', cln)
                }
            }
        }
        console.verbose('CRM: cascading resources cleaned')
    }

    private async deployCascadingResources() {
        const target = this.target
        if (!target.resources) return

        for (const category in target.resources) {
            const resources = target.resources[category]
            const usings = resources.using
            if (!usings || usings.length == 0) continue
            console.verbose('CRM: deploying cascading resources %s: %s', category, usings.join(', '))

            const src = resources.src
                ? join(this.path, resources.src)
                : join(this.path, PROJECT.RPATH.RESOURCES, category)
            console.verbose('CRM: src = %s', src)

            const dst = resources.dst
                ? join(this.path, resources.dst)
                : join(this.path, category)
            console.verbose('CRM: dst = %s', dst)

            const stg = resources.deploy ?? 'copy'
            console.verbose('CRM: deploy = %s', stg)

            const cln = resources.clean ?? 'auto'
            console.verbose('CRM: clean = %s', cln)

            // 按需创建目标路径
            await mkdir(dst, { recursive: true })

            // 部署资源
            for (const using of usings) {
                switch (stg) {
                    case 'copy': {
                        console.verbose('CRM: copying %s to %s', join(src, using), dst)
                        await promisify(exec)(`cp -r ${join(src, using)}/* ${dst}/.`)
                    } break
                    case 'slink': {
                        // 定位源路径下所有的文件
                        const files = await Find(join(src, using))
                        for (const file of files) {
                            console.verbose('CRM: creating symlink %s to %s', join(dst, file), join(src, using, file))
                            await mkdir(dirname(join(dst, file)), { recursive: true })
                            await promisify(exec)(`ln -rsf ${join(src, using, file)} ${join(dst, file)}`)
                        }
                    } break
                    default: {
                        throw new Error('Unknown deploy strategy: %s', stg)
                    }
                }
            }
        }

        console.verbose('CRM: cascading resources deployed')
    }

    private async activateDependencies() {
        const target = this.target
        if (!target.requires) return

        // 重新创建模拟系统根
        await mkdir(join(this.path, PROJECT.RPATH.SYSROOT), { recursive: true })

        // 逐一激活依赖
        for (const name in target.requires) {
            const version = target.requires[name]
            const ids = await QueryPackage(name, version)
            const id = PackageId.FromString(ids[0])
            if (id instanceof Error) throw id
            await ActivatePackage(id)
        }
    }

    private async deactivateDependencies() {
        // 读取激活记录
        try {
            const apath = join(this.path, PROJECT.RPATH.SYSROOT, 'activation')
            const activation = (await readFile(apath, 'utf-8')).split('\n')

            // 逐一灭活依赖
            for (const id of activation) {
                const pkg = PackageId.FromString(id)
                if (pkg instanceof Error) {
                    console.warn('clean: invalid activation record found: %s', id)
                    continue
                }
                await DeactivatePackage(pkg)
            }
        } catch (e) {
            console.verbose('clean: no activation record found, skipping dependency deactivation')
        }

        // 删除模拟系统根
        await promisify(exec)(`rm -rf ${join(this.path, PROJECT.RPATH.SYSROOT)}`)
    }

    private async fetchSubmodules() {
        const target = this.target
        const modules = target.modules
        if (!modules) return

        if (SidePlatform.settings.offline === true) {
            console.warn('Skipping submodule fetching due to offline mode')
            return
        }

        const run = process.env['SIDE_VERBOSE'] === 'TRUE'
            ? (cmd: string, opts?: SpawnOptionsWithoutStdio) => {
                console.verbose('setup: running %s', cmd)
                const sp = spawn(cmd, { ...opts, stdio: 'inherit' })
                return new Promise<void>((resolve, reject) => {
                    sp.on('close', code => {
                        if (code === 0) resolve()
                        else reject(new Error(`Command exited with non-zero code: ${code}`))
                    })
                })
            }
            : promisify(exec)

        for (const name in modules) {
            const module = modules[name]

            // 按需创建子模块目录
            await mkdir(join(this.path, this.manifest.dirs.MODULE), { recursive: true })
            const mpath = join(this.path, this.manifest.dirs.MODULE, name) // 子模块路径

            console.verbose("setup: fetching submodule '%s'", name)

            // 获取子模块仓库
            if (!await IsExist(mpath)) {
                await run(`git clone ${module.repo} ${mpath}`, { shell: '/bin/bash' })
            }

            // 将子仓库更新到最新
            await run('git fetch origin', { cwd: mpath, shell: '/bin/bash' })

            // 切换到指定分支
            if (module.checkout) {
                await run(`git checkout ${module.checkout}`, { cwd: mpath, shell: '/bin/bash' })
            }

            // 将子仓库更新到最新
            await run('git pull', { cwd: mpath, shell: '/bin/bash' })
        }
    }

    /** 计算目标清单 */
    private async collectTargets(target: string, fmt: 'target' | 'aspect' = 'target') {
        const file = join(this.path, PROJECT.RPATH.TARGETS, fmt + '-' + target)
        const targets: (ProjectTarget | ProjectAspect)[] = []

        if (fmt == 'target') {
            const manifest = loadYamlSync<ProjectTarget>(file, 'ProjectTarget')

            // 追加继承的目标
            if (typeof manifest.inherit === 'string') {
                const inherits = await this.collectTargets(manifest.inherit, 'target')
                targets.push(...inherits)
            }

            // 追加聚合的切面
            if (manifest.composites instanceof Array) {
                for (const composite of manifest.composites) {
                    const composites = await this.collectTargets(composite, 'aspect')
                    targets.push(...composites)
                }
            }

            // 追加自身
            targets.push(manifest)
        } else {
            const manifest = loadYamlSync<ProjectAspect>(file, 'ProjectAspect')
            targets.push(manifest)
            // 切面文件不支持继承也不支持聚合
        }

        return targets
    }

    private constructor(readonly path: string, readonly manifest: ProjectManifest) { }

    static Open(path: string = process.cwd()) {
        const { projectManifest, projectPath } = locateProjectManifest(path)
        if (!projectManifest) throw new Error('Cannot locate project manifest.')
        return new Project(projectPath, projectManifest)
    }

    static async Create(path: string = process.cwd(), force = false) {
        console.verbose('Creating project in %s', path)

        // 如果项目已存在，且不强制覆盖，则抛出异常
        const { projectManifest } = await locateProjectManifest(path)
        if (projectManifest) {
            if (!force) throw new Error('Project already exists.')
            console.warn('Project already exists. Overwriting...')
            await rmdir(join(path, PROJECT.RPATH.META), { recursive: true })
        }

        // 创建项目目录结构
        console.verbose('build folder structure')
        await mkdir(join(path, PROJECT.RPATH.TARGETS), { recursive: true })
        await mkdir(join(path, PROJECT.RPATH.SCRIPTS), { recursive: true })
        await mkdir(join(path, PROJECT.RPATH.RESOURCES), { recursive: true })
        await mkdir(join(path, PROJECT.RPATH.SYSROOT), { recursive: true })

        // 初始化项目清单
        console.verbose('initiate manifest')
        FileDB.Create<ProjectManifest>(join(path, PROJECT.RPATH.MANIFEST), {
            project: basename(path),
            engine: SidePlatform.version
        }, {
            format: 'yaml',
            schema: 'ProjectManifest',
        })

        // 初始化 Git 相关
        console.verbose('initiate git stuff')
        try {
            const result = await promisify(exec)('git init', { cwd: path })
            if (result.stderr) console.error(result.stderr.trim())
            if (result.stdout) console.info(result.stdout.trim())
        } catch (e) {
            // pass
        }

        // 创建项目元空间的 .gitignore 文件
        await writeFile(join(path, PROJECT.RPATH.META, '.gitignore'), '# ignore files\n\n'
            + '/*\n'
            + `!/${relative(PROJECT.RPATH.META, PROJECT.RPATH.RESOURCES)}/\n`
            + `!/${relative(PROJECT.RPATH.META, PROJECT.RPATH.SCRIPTS)}/\n`
            + `!/${relative(PROJECT.RPATH.META, PROJECT.RPATH.TARGETS)}/\n`
            + `!/${relative(PROJECT.RPATH.META, PROJECT.RPATH.MANIFEST)}\n`
            + `!/${relative(PROJECT.RPATH.META, PROJECT.RPATH.DEPLOCK)}\n`
            + '!/.gitignore\n'
        )

        try {
            // 若已存在 .gitignore 文件，则在文件末尾添加内容
            let ignore = await readFile(join(path, '.gitignore'), 'utf-8')
            ignore += '\n\n# ignore files generated by side\n\n'
                + `/${relative(path, PROJECT.DEFAULT_DIRS.BUILD)}/\n`
                + `/${relative(path, PROJECT.DEFAULT_DIRS.RELEASE)}/\n`
                + `/${relative(path, PROJECT.DEFAULT_DIRS.MODULE)}/\n`
            await writeFile(join(path, '.gitignore'), ignore)
        } catch {
            // 若不存在 .gitignore 文件，则创建文件
            await writeFile(join(path, '.gitignore'), '# ignore files generated by side\n\n'
                + `/${relative(path, PROJECT.DEFAULT_DIRS.BUILD)}/\n`
                + `/${relative(path, PROJECT.DEFAULT_DIRS.RELEASE)}/\n`
                + `/${relative(path, PROJECT.DEFAULT_DIRS.MODULE)}/\n`
            )
        }
    }

    static This() {
        if (thisProject === undefined) {
            try {
                thisProject = Project.Open(process.env.SIDE_PROJECT || process.cwd())
            } catch (e) {
                console.debug('Failed to open project: %s', e.message)
                thisProject = null
            }
        }
        return thisProject
    }

    static Stat(path: string) {
        while (path !== '/') {
            const fpath = join(path, PROJECT.RPATH.MANIFEST)
            if (statSync(fpath, { throwIfNoEntry: false })?.isFile()) {

                const manifest = yaml.load(readFileSync(fpath, 'utf-8')) as ProjectManifest
                try {
                    const target = yaml.load(readFileSync(join(path, PROJECT.RPATH.TARGET), 'utf-8')) as ProjectFinalTarget
                    return {
                        name: manifest.project,
                        target: target.target,
                        stage: target.stage,
                    }
                } catch (e) {
                    return {
                        name: manifest.project,
                    }
                }
            }
            path = resolve(path, '..')
        }
        return {}
    }
}

export function locateProjectManifest(path: string) {
    while (path !== '/') {
        if (statSync(join(path, PROJECT.RPATH.MANIFEST), { throwIfNoEntry: false })?.isFile()) {
            const manifest = FileDB.Open<ProjectManifest>(join(path, PROJECT.RPATH.MANIFEST), {
                format: 'yaml',
                schema: 'ProjectManifest',
                placeholder: {
                    dirs: PROJECT.DEFAULT_DIRS
                }
            })
            return { projectManifest: manifest, projectPath: path }
        }
        path = resolve(path, '..')
    }
    return { projectManifest: undefined, projectPath: undefined }
}

let thisProject: undefined | Project