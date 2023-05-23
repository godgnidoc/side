import { readFile, mkdir, stat, writeFile, access } from 'fs/promises'
import { createWriteStream } from 'fs'
import * as pstream from 'progress-stream'
import * as progress from 'progress'
import { dirname, join } from 'path'

import { Cache, PackageId, PackageManifest, loadJson } from 'format'
import { api } from 'dist/api'
import { PROJECT, Project } from 'project'
import { SidePlatform } from 'platform'
import { promisify } from 'util'
import { exec, spawn } from 'child_process'
import { inflate } from 'inflate'
import { vmerge } from 'notion'
import { SemVer } from 'semver'
import { Find } from 'filesystem'

interface PackageOpOptions {
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

export function selectPackingManifest(path?: string) {
    if (!path) return join(Project.This().path, PROJECT.RPATH.TARGET)
    return path
}

export function selectReleasePath() {
    return join(Project.This().path, Project.This().manifest.dirs.RELEASE)
}

export async function QueryPackage(query: string, version?: SemVer) {
    const result = await api.package.query(query, version?.format())
    if (result.status !== 0) {
        console.error('Failed to search scopes: %s', result.message)
        return undefined
    }

    return result.data
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

    const index: Cache = JSON.parse(await readFile(join(SidePlatform.paths.caches, 'index.json'), 'utf-8'))
    const cached = index[id]
    if (!cached) {
        console.verbose('check: Package %s is not cached', id)
        return false
    }
    console.verbose('check: Cached: size=%s mtime=%s', cached.lsize, cached.lmtime)
    if (lstat.size !== cached.lsize || lstat.mtimeMs !== cached.lmtime) {
        console.verbose('check: Local stat mismatch, package %s is not up to date', id)
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

export async function IsPackageInstalled(packageId: PackageId) {
    const id = packageId.toString()

    if (0 === await invokePackageHook(packageId, 'test', { failOnMissing: true })) {
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

    // 获取远端文件流
    console.verbose('fetch: Package %s is not up to date, downloading', id)
    const download = await api.package.download(id)
    if (download.status !== 0) return new Error(download.message)

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
    const lstat = await stat(packageId.localPath)
    let index: Cache = {}
    try {
        index = JSON.parse(await readFile(join(SidePlatform.paths.caches, 'index.json'), 'utf-8'))
    } catch {
        console.verbose('fetch: Failed to read cache index, creating new one')
    }
    index[id] = {
        mtime: download.data.mtime,
        size: download.data.size,
        lmtime: lstat.mtimeMs,
        lsize: lstat.size
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
    try {
        await access(join(dist.SIDE_DIST_PATH, 'root.tar.xz'))
        await mkdir(dist.SIDE_DIST_ROOT)
        await promisify(exec)(`tar -xf ${join(dist.SIDE_DIST_PATH, 'root.tar.xz')} -C ${dist.SIDE_DIST_ROOT}`)
    } catch (e) {
        console.verbose('Failed to unpack root.tar.xz: %s', e.message)
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
            const pids = await QueryPackage(dep, new SemVer(manifest.depends[dep]))
            if (pids.length === 0) {
                throw new Error('Package ' + dep + ':' + manifest.depends[dep] + ' not found')
            }
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
            const pids = await QueryPackage(dep, new SemVer(manifest.depends[dep]))
            if (pids.length === 0) {
                throw new Error('Package ' + dep + ':' + manifest.depends[dep] + ' not found')
            }
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
            const files = await Find(dist.SIDE_DIST_ROOT, manifest.deploy)
            for (const file of files) {
                console.verbose('activate: copying %s', file)
                await mkdir(dirname(join(project.path, PROJECT.RPATH.SYSROOT, file)), { recursive: true })
                await promisify(exec)(`cp ${join(dist.SIDE_DIST_ROOT, file)} ${join(project.path, PROJECT.RPATH.SYSROOT, file)}`)
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
        await writeFile(apath, JSON.stringify(packageId.toString()))
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
    if (!await IsPackageUnpacked(packageId)) {
        console.verbose('uninstall: package %s not installed, skiped', packageId.toString())
        return
    }

    // 尝试调用卸载脚本
    if (0 !== await invokePackageHook(packageId, 'uninstall')) {
        throw new Error('Failed to invoke uninstall script')
    }

    // 删除包目录
    try {
        await promisify(exec)('rm -rf ' + packageId.dist.SIDE_DIST_PATH)
    } catch (e) {
        console.verbose(e)
    }
}

export async function invokePackageHook(packageId: PackageId, hook: string, options?: { failOnMissing?: boolean, ignoreError?: boolean }) {
    const dist = packageId.dist
    const script = join(dist.SIDE_DIST_PATH, 'hook', hook)

    try {
        await access(script)
    } catch {
        console.verbose('package hook %s not found, skiped', hook)
        return options?.failOnMissing ? 1 : 0
    }

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