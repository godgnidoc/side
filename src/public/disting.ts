import { readFile, mkdir, stat, writeFile } from 'fs/promises'
import { createWriteStream } from 'fs'
import * as pstream from 'progress-stream'
import * as progress from 'progress'
import { dirname, join } from 'path'

import { Cache, FileDB, PackageId, DepLock, PackageManifest, loadJson, validateSync, getLastValidateErrorText } from 'format'
import { api } from 'dist/api'
import { PROJECT, Project } from 'project'
import { SidePlatform } from 'platform'
import { promisify } from 'util'
import { exec, spawn } from 'child_process'
import { inflate } from 'inflate'
import { vmerge } from 'notion'
import { Find, IsExist } from 'filesystem'
import { satisfies } from 'semver'

interface QueryOptions {
    // 忽略版本锁定，强制查询最新版本
    ignoreLock?: boolean

    // 不保存查询结果到 package.lock.json
    skipSave?: boolean
}

interface PackageOpOptions extends QueryOptions {
    // 放弃自动满足前置条件
    disableAutos?: boolean

    // 忽略递归，默认为 false
    disableRecursive?: boolean

    // 忽略 cache 强制下载，默认为 false
    ignoreCache?: boolean

    // 忽略 unpack mark 强制解包，默认为 false
    forceUnpack?: boolean

    // 忽略 test 结果，强制安装，默认为 false
    forceInstall?: boolean
}

export async function QueryPackage(query: string, version?: string, options?: QueryOptions) {
    const project = Project.This()
    const target = project?.target?.target
    const cache = project
        ? FileDB.OpenOrCreate<DepLock>(join(project.path, PROJECT.RPATH.DEPLOCK), {}, {
            format: 'yaml',
            schema: 'DepLock'
        })
        : undefined

    console.verbose('query: Query package %s', query)
    while (true) {
        if (options?.ignoreLock === true) {
            console.verbose('query: Lock file is ignored')
            break
        }
        if (!cache) {
            console.verbose('query: Lock file is not available')
            break
        }
        if (!(target in cache)) {
            console.verbose('query: target %s not found in lock file', target)
            break
        }

        const tcache = cache[target]
        if (!(query in tcache)) {
            console.verbose('query: Package query not found in lock file: %s', query)
            break
        }
        if (version && !satisfies(tcache[query].version, version)) {
            console.warn('query: Package query hit lock for %s, but version mismatch: %s', query, tcache[query].version)
            break
        } else {
            console.verbose('query: Package query hit lock for %s: %o', query, FileDB.Dump(tcache[query]))
            const id = PackageId.FromQuery(query, tcache[query].version)
            if (id instanceof Error) throw id
            return [id.toString()]
        }
    }

    if (SidePlatform.settings.offline === true) {
        console.error('Cannot determine package version in offline mode without lock file')
        throw new Error('Unrecorverable error')
    }

    const result = await api.package.query(query, version)
    if (result.status !== 0) {
        console.error('Failed to search scopes: %s', result.message)
        throw new Error('Unrecorverable error')
    }

    if (options?.skipSave !== true && cache && result.data[0]) {
        const id = PackageId.FromString(result.data[0])
        if (id instanceof Error) throw id
        if (target in cache) cache[target][query] = { version: id.version.format() }
        else cache[target] = { [query]: { version: id.version.format() } }
        console.verbose('query: Package query save lock for %s: %o', query, FileDB.Dump(cache[target][query]))
    }

    if (result.data.length === 0) {
        console.error('Failed to query package %s', query)
        throw new Error('Unrecorverable error')
    }

    return result.data
}

export async function ClosurePackage(packageId: string, options?: PackageOpOptions) {
    const task: string[] = [packageId]
    const result: string[] = []

    while (task.length > 0) {
        const id = task.pop()
        const packageId = PackageId.FromString(id)
        if (packageId instanceof Error) throw packageId
        if (result.includes(id)) continue
        result.push(id)

        console.verbose('closure: Query package %s', packageId.toString())
        const manifest = await StatPackage(packageId, options)
        if (!manifest.depends) continue

        for (const query in manifest.depends) {
            const version = manifest.depends[query]
            console.verbose('closure: Query dependency %s against version %s', query, version)
            const dep = (await QueryPackage(query, version, options))[0]

            task.push(dep)
        }
    }

    return result
}

export async function IsPackageExists(packageId: PackageId) {
    try {
        await stat(packageId.localPath)
        console.verbose('check: Package %s already exists', packageId.toString())
        return true
    } catch {
        console.verbose('check: Package %s does not exist', packageId.toString())
        return false
    }
}

export async function IsPackageUpToDate(packageId: PackageId) {
    const id = packageId.toString()
    console.verbose('check: stat package : %s', id)
    const lstat = await stat(packageId.localPath)
    console.verbose('check: Local stat: size=%s mtime=%s', lstat.size, lstat.mtimeMs)

    const index = await loadJson<Cache>(join(SidePlatform.paths.caches, 'index.json'), 'Cache')

    if (SidePlatform.settings.offline === true) {
        console.warn('Assuming package %s is up to date in offline mode', id)
        return true
    }

    const cached = index[id]
    if (!cached) {
        console.verbose('check: Package %s is not cached', id)
        return false
    }

    const rstat = await api.package.stat(id)
    if (rstat.status !== 0) {
        console.verbose('check: Failed to get package stat: %s', rstat.message)
        return false
    }
    console.verbose('check: Remote stat: size=%s mtime=%s', rstat.data.size, rstat.data.mtime)

    const upToDate = rstat.data.mtime === cached.mtime && rstat.data.size === cached.size
    if (upToDate) console.verbose('check: Package %s is up to date', id)
    else console.verbose('check: Package %s is not up to date', id)
    return upToDate
}

export async function IsPackageUnpacked(packageId: PackageId) {
    const id = packageId.toString()
    const dist = packageId.dist
    const mark = join(dist.SIDE_DIST_PATH, 'meta', 'fully-unpacked.mark')

    try {
        // TODO assume that package is already unpacked if package is not exists but mark exists
        const stp = await stat(packageId.localPath)
        const stm = await stat(mark)
        if (stm.mtimeMs < stp.mtimeMs) {
            console.verbose('check: New package %s is fetched after last unpack', id)
            return false
        }
        console.verbose('check: Package %s is already fully unpacked', id)
        return true
    } catch {
        console.verbose('check: Package %s is not unpacked', id)
        return false
    }
}

export async function StatPackage(packageId: PackageId, options?: PackageOpOptions) {
    if (!options?.ignoreCache && await IsPackageExists(packageId) && await IsPackageUpToDate(packageId)) {
        if (await IsPackageUnpacked(packageId)) {
            console.verbose('stat: Package %s is already unpacked, reading manifest directly', packageId.toString())
            return await loadJson<PackageManifest>(join(packageId.dist.SIDE_DIST_PATH, 'meta', 'manifest'), 'PackageManifest')
        }

        console.verbose('stat: Package %s is already exists, reading manifest from tarball', packageId.toString())
        const raw = await promisify(exec)('tar -xOf ' + packageId.localPath + ' meta/manifest')
        const manifest = JSON.parse(raw.stdout)
        if (!validateSync<PackageManifest>(manifest, 'PackageManifest'))
            throw new Error(getLastValidateErrorText('PackageManifest'))
        if (manifest instanceof Error) throw manifest
        return manifest
    }

    console.verbose('stat: Package %s is not cached, fetching from remote', packageId.toString())
    const result = await api.package.stat(packageId.toString())
    if (result.status !== 0) {
        throw new Error(result.message)
    }

    return result.data.manifest
}

export async function IsPackageInstalled(packageId: PackageId) {
    const id = packageId.toString()

    if (0 === await invokePackageHook(packageId, 'test', { failOnMissing: true, ignoreError: true })) {
        console.verbose('check: Package %s is already installed', id)
        return true
    } else {
        console.verbose('check: Package %s is not installed', id)
        return false
    }
}

export async function FetchPackage(packageId: PackageId, options?: PackageOpOptions) {
    const id = packageId.toString()

    // 检查缓冲，判断是否需要下载
    if (!options?.ignoreCache && await IsPackageExists(packageId) && await IsPackageUpToDate(packageId)) {
        console.verbose('fetch: Package %s is up to date', id)
        return packageId.localPath
    }

    if (SidePlatform.settings.offline === true) {
        console.error('Cannot fetch package %s in offline mode', id)
        throw new Error('Unrecoverable error')
    }

    // 获取远端文件流
    console.verbose('fetch: Package %s is not up to date, downloading', id)
    const download = await api.package.download(id)
    if (download.status !== 0) throw new Error(download.message)

    // 下载文件
    await mkdir(packageId.localRepoPath, { recursive: true })
    const ws = createWriteStream(packageId.localPath)
    const str = pstream({ length: download.data.size, time: 100 })
    const bar = new progress(`fetch:    downloading ${id} [:bar] :percent :etas`, {
        complete: '>',
        incomplete: ' ',
        width: 20,
        total: download.data.size
    })
    str.on('progress', p => bar.tick(p.delta))
    download.data.stream.pipe(str).pipe(ws, { end: true })
    await new Promise(resolve => { ws.on('close', resolve) })
    console.verbose('fetch: Package %s downloaded', id)

    // 更新缓冲
    let index: Cache = {}
    try {
        index = JSON.parse(await readFile(join(SidePlatform.paths.caches, 'index.json'), 'utf-8'))
    } catch {
        console.verbose('fetch: Failed to read cache index, creating new one')
    }
    index[id] = {
        mtime: download.data.mtime,
        size: download.data.size,
    }
    await mkdir(join(SidePlatform.paths.caches), { recursive: true })
    await writeFile(join(SidePlatform.paths.caches, 'index.json'), JSON.stringify(index))

    return packageId.localPath
}

export async function UnpackPackage(packageId: PackageId, options?: PackageOpOptions) {
    const dist = packageId.dist
    const mark = join(dist.SIDE_DIST_PATH, 'meta', 'fully-unpacked.mark')

    if (options?.disableAutos) {
        if (!await IsPackageExists(packageId)) {
            throw new Error('Package ' + packageId.toString() + ' not fetched yet')
        }
    } else {
        await FetchPackage(packageId, options)
    }

    // 检查解压标志
    if (!options?.forceUnpack && await IsPackageUnpacked(packageId)) {
        console.verbose('unpack: Package %s is already fully unpacked', packageId.toString())
        return
    }

    console.verbose('unpack: Package %s is not fully unpacked, unpacking', packageId.toString())
    await mkdir(dist.SIDE_DIST_PATH, { recursive: true })
    await promisify(exec)(`chmod -R 777 ${dist.SIDE_DIST_PATH}`)
    await promisify(exec)(`rm -rf ${dist.SIDE_DIST_PATH}`)
    await mkdir(dist.SIDE_DIST_PATH, { recursive: true })
    await promisify(exec)(`tar -xf ${packageId.localPath} -C ${dist.SIDE_DIST_PATH}`)
    if (await IsExist(join(dist.SIDE_DIST_PATH, 'root.tar.xz'))) {
        await mkdir(dist.SIDE_DIST_ROOT)
        await promisify(exec)(`tar -xf ${join(dist.SIDE_DIST_PATH, 'root.tar.xz')} -C ${dist.SIDE_DIST_ROOT}`)
    }
    await writeFile(mark, 'unpacked: ' + new Date().toLocaleString())
    console.verbose('unpack: Package %s unpacked', packageId.toString())
}


export async function InstallPackage(packageId: PackageId, options?: PackageOpOptions) {
    if (options?.disableAutos) {
        if (!await IsPackageUnpacked(packageId)) {
            throw new Error('Package ' + packageId.toString() + ' not unpacked yet')
        }
    } else {
        await UnpackPackage(packageId, options)
    }

    // 检查安装状态
    if (!options?.forceInstall && await IsPackageInstalled(packageId)) {
        console.verbose('install: Package %s is already installed', packageId.toString())
        return
    }
    console.verbose('install: Package %s is not installed, installing', packageId.toString())

    // 加载包清单
    const manifest = await loadJson<PackageManifest>(join(packageId.dist.SIDE_DIST_PATH, 'meta', 'manifest'), 'PackageManifest')

    // 逐个安装依赖
    if (!options?.disableRecursive && manifest.depends) {
        for (const dep in manifest.depends) {
            const pids = await QueryPackage(dep, manifest.depends[dep], options)
            const pid = PackageId.FromString(pids[0])
            if (pid instanceof Error) throw pid
            await InstallPackage(pid, options)
        }
    }

    if (0 !== await invokePackageHook(packageId, 'install')) {
        throw new Error('Failed to invoke install script')
    }

    console.verbose('install: Package %s installed', packageId.toString())
}

export async function ActivatePackage(packageId: PackageId, options?: PackageOpOptions) {
    const dist = packageId.dist

    if (options?.disableAutos) {
        if (!await IsPackageInstalled(packageId)) {
            throw new Error('Package ' + packageId.toString() + ' not installed yet')
        }
    } else {
        await InstallPackage(packageId, options)
    }

    // 加载包清单
    const manifest = await loadJson<PackageManifest>(join(dist.SIDE_DIST_PATH, 'meta', 'manifest'), 'PackageManifest')

    // 逐个激活依赖
    if (!options?.disableRecursive && manifest.depends) {
        for (const dep in manifest.depends) {
            const pids = await QueryPackage(dep, manifest.depends[dep], options)
            const pid = PackageId.FromString(pids[0])
            if (pid instanceof Error) throw pid
            await ActivatePackage(pid, options)
        }
    }

    // 自动部署
    const project = Project.This()
    switch (manifest.deploy?.strategy) {
        case 'none': break
        case 'slink': {
            // 定位源路径下所有的文件
            const files = await Find(dist.SIDE_DIST_ROOT, manifest.deploy)
            for (const file of files) {
                console.verbose('activate: soft linking %s', file)
                await mkdir(dirname(join(project.path, PROJECT.RPATH.SYSROOT, file)), { recursive: true })
                await promisify(exec)(`ln -rsf ${join(dist.SIDE_DIST_ROOT, file)} ${join(project.path, PROJECT.RPATH.SYSROOT, file)}`)
            }
        } break
        case 'hlink': {
            // 定位源路径下所有的文件
            const files = await Find(dist.SIDE_DIST_ROOT, manifest.deploy)
            for (const file of files) {
                console.verbose('activate: hard linking %s', file)
                await mkdir(dirname(join(project.path, PROJECT.RPATH.SYSROOT, file)), { recursive: true })
                await promisify(exec)(`ln -f ${join(dist.SIDE_DIST_ROOT, file)} ${join(project.path, PROJECT.RPATH.SYSROOT, file)}`)
            }
        } break
        case 'copy': {
            // 定位源路径下所有的文件
            const files = await Find(dist.SIDE_DIST_ROOT, { ...manifest.deploy, collapse: true })
            for (const file of files) {
                console.verbose('activate: copying %s', file)
                await mkdir(dirname(join(project.path, PROJECT.RPATH.SYSROOT, file)), { recursive: true })
                await promisify(exec)(`cp -a -T ${join(dist.SIDE_DIST_ROOT, file)} ${join(project.path, PROJECT.RPATH.SYSROOT, file)}`)
            }
        } break
    }

    // 尝试调用激活脚本
    if (0 !== await invokePackageHook(packageId, 'activate')) {
        throw new Error('Failed to invoke activate script')
    }

    // 写入激活记录
    const apath = join(project.path, PROJECT.RPATH.SYSROOT, 'activation')
    try {
        const activation = (await readFile(apath, 'utf-8')).split('\n')
        if (!activation.includes(packageId.toString())) {
            activation.push(packageId.toString())
        }
        await writeFile(apath, activation.join('\n'))
    } catch {
        await writeFile(apath, packageId.toString())
    }
}

export async function DeactivatePackage(packageId: PackageId) {
    if (!await IsPackageInstalled(packageId)) {
        console.verbose('package %s not installed, skiped', packageId.toString())
        return
    }

    // 尝试调用灭活脚本
    if (0 !== await invokePackageHook(packageId, 'deactivate')) {
        throw new Error('Failed to invoke deactivate script')
    }
}

export async function UninstallPackage(packageId: PackageId) {
    if (await IsPackageUnpacked(packageId)) {
        // 尝试调用卸载脚本
        if (0 !== await invokePackageHook(packageId, 'uninstall')) {
            throw new Error('Failed to invoke uninstall script')
        }
    }

    // 删除包目录
    try {
        console.verbose('rm -rf ' + packageId.dist.SIDE_DIST_PATH)
        await promisify(exec)('rm -rf ' + packageId.dist.SIDE_DIST_PATH)
    } catch (e) {
        console.verbose(e)
    }
}

export async function invokePackageHook(packageId: PackageId, hook: string, options?: { failOnMissing?: boolean, ignoreError?: boolean }) {
    const dist = packageId.dist
    const script = join(dist.SIDE_DIST_PATH, 'hook', hook)

    if (!await IsExist(script)) {
        console.verbose('package hook %s not found, skiped', hook)
        return options?.failOnMissing ? 1 : 0
    }

    await mkdir(join(SidePlatform.paths.sysroot, 'bin'), { recursive: true })
    await mkdir(join(SidePlatform.paths.sysroot, 'usr', 'bin'), { recursive: true })

    await promisify(exec)(`chmod +x ${script}`)
    const env = inflate(vmerge(
        Project.This() ? Project.This().exports : SidePlatform.exports,
        dist
    ))
    console.verbose('invoke hook %s', script)
    const child = spawn(script, {
        env,
        stdio: 'inherit',
        shell: '/bin/bash',
        cwd: dist.SIDE_DIST_PATH
    })

    return new Promise<number>((resolve) => {
        child.on('exit', code => {
            if (code !== 0) {
                if (options?.ignoreError) {
                    console.verbose('package hook %s exited with code %d', script, code)
                } else {
                    console.error('package hook %s exited with code %d', script, code)
                }
            }
            resolve(code)
        })
    })
}