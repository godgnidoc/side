import { readFile, mkdir, stat, writeFile, access } from 'fs/promises'
import { createWriteStream } from 'fs'
import { load } from 'js-yaml'
import { dirname, join } from 'path'

import { PackingManifest, Cache, PackageId, PackageManifest } from 'format'
import { api } from '../api'
import { PROJECT, Project } from 'project'
import { SidePlatform } from 'platform'
import { promisify } from 'util'
import { exec, spawn } from 'child_process'
import { getEnvBackup, inflate } from 'inflate'
import { vmerge } from 'notion'
import { SemVer } from 'semver'

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
    const result = await api.package.query(query, version.format())
    if (result.status !== 0) {
        console.error('Failed to search scopes: %s', result.message)
        return undefined
    }

    return result.data
}

export async function loadPackingManifest(path: string) {
    const packingManifest = PackingManifest.Parse(load(await readFile(path, 'utf8')))
    if (packingManifest instanceof Error) throw packingManifest
    return packingManifest.packing
}

export async function IsPackageExists(packageId: PackageId) {
    try {
        await stat(packageId.lpath)
        console.verbose('Package %s already exists', packageId.toString())
        return true
    } catch {
        return false
    }
}

export async function IsPackageUpToDate(packageId: PackageId) {
    const id = packageId.toString()
    console.verbose('stat package : %s', id)
    const lstat = await stat(packageId.lpath)
    console.verbose('Local stat: size=%s mtime=%s', lstat.size, lstat.mtimeMs)

    const index: Cache = JSON.parse(await readFile(join(SidePlatform.paths.caches, 'index.json'), 'utf-8'))
    const cached = index[id]
    if (!cached) return false
    console.verbose('Cached: %o', cached)
    if (lstat.size !== cached.lsize || lstat.mtimeMs !== cached.lmtime) return false

    const rstat = await api.package.stat(id)
    if (rstat.status !== 0) {
        console.verbose('Failed to get package stat: %s', rstat.message)
        return false
    }
    console.verbose('Remote stat: %o', rstat.data)
    return rstat.data.mtime === cached.mtime && rstat.data.size === cached.size
}

export async function IsPackageUnpacked(packageId: PackageId) {
    const id = packageId.toString()
    const dist = packageId.dist
    const mark = join(dist.SIDE_DIST_PATH, 'meta', 'fully-unpacked.mark')

    try {
        await access(mark)
        console.verbose('Package %s is already fully unpacked', id)
        return true
    } catch {
        return false
    }
}

export async function IsPackageInstalled(packageId: PackageId) {
    const id = packageId.toString()

    if (0 === await invokePackageHook(packageId, 'test', true)) {
        console.verbose('Package %s is already installed', id)
        return true
    } else {
        return false
    }
}

export async function FetchPackage(packageId: PackageId, options?: PackageOpOptions) {
    const id = packageId.toString()

    // 检查缓冲，判断是否需要下载
    if (!options?.ignoreCache && await IsPackageExists(packageId) && await IsPackageUpToDate(packageId)) {
        console.verbose('Package %s is up to date', id)
        return packageId.lpath
    }

    // 获取远端文件流
    console.verbose('Package %s is not up to date, downloading', id)
    const download = await api.package.download(id)
    if (download.status !== 0) return new Error(download.message)

    // 下载文件
    await mkdir(packageId.lrepo_path, { recursive: true })
    const ws = createWriteStream(packageId.lpath)
    download.data.stream.pipe(ws, { end: true })
    await new Promise(resolve => { download.data.stream.on('end', resolve) })
    console.verbose('Package %s downloaded', id)

    // 更新缓冲
    const lstat = await stat(packageId.lpath)
    let index: Cache = {}
    try {
        index = JSON.parse(await readFile(join(SidePlatform.paths.caches, 'index.json'), 'utf-8'))
    } catch {
        console.verbose('Failed to read cache index, creating new one')
    }
    index[id] = {
        mtime: download.data.mtime,
        size: download.data.size,
        lmtime: lstat.mtimeMs,
        lsize: lstat.size
    }
    await mkdir(join(SidePlatform.paths.caches), { recursive: true })
    await writeFile(join(SidePlatform.paths.caches, 'index.json'), JSON.stringify(index))

    return packageId.lpath
}

export async function UnpackPackage(packageId: PackageId, options?: PackageOpOptions) {
    const dist = packageId.dist
    const mark = join(dist.SIDE_DIST_PATH, 'meta', 'fully-unpacked.mark')

    if (options.disableAutos) {
        if (!await IsPackageExists(packageId)) {
            throw new Error('Package ' + packageId.toString() + ' not fetched yet')
        }
    } else {
        await FetchPackage(packageId, options)
    }

    // 检查解压标志
    if (!options?.forceUnpack && await IsPackageUnpacked(packageId)) {
        return
    }

    await mkdir(dist.SIDE_DIST_PATH, { recursive: true })
    await promisify(exec)(`chmod -R 777 ${dist.SIDE_DIST_PATH}`)
    await promisify(exec)(`rm -rf ${dist.SIDE_DIST_PATH}`)
    await mkdir(dist.SIDE_DIST_PATH, { recursive: true })
    await promisify(exec)(`tar -xf ${packageId.lpath} -C ${dist.SIDE_DIST_PATH}`)
    try {
        await access(join(dist.SIDE_DIST_PATH, 'root.tar.xz'))
        await mkdir(dist.SIDE_DIST_ROOT)
        await promisify(exec)(`tar -xf ${join(dist.SIDE_DIST_PATH, 'root.tar.xz')} -C ${dist.SIDE_DIST_ROOT}`)
    } catch (e) {
        console.verbose('Failed to unpack root.tar.xz: %s', e.message)
    }
    await writeFile(mark, 'unpacked: ' + new Date().toLocaleString())
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
        return
    }

    // 加载包清单
    const manifest = PackageManifest.Parse(JSON.parse(await readFile(join(packageId.dist.SIDE_DIST_PATH, 'meta', 'manifest'), 'utf-8')))
    if (manifest instanceof Error) throw manifest

    // 逐个安装依赖
    if (!options.disableRecursive && manifest.depends) {
        for (const dep in manifest.depends) {
            const pids = await QueryPackage(dep, manifest.depends[dep])
            if (pids.length === 0) {
                throw new Error('Package ' + dep + ':' + manifest.depends[dep] + ' not found')
            }
            const pid = PackageId.Parse(pids[0])
            if (pid instanceof Error) throw pid
            await InstallPackage(pid, options)
        }
    }

    if (0 !== await invokePackageHook(packageId, 'install')) {
        throw new Error('Failed to invoke install script')
    }
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
    const manifest = PackageManifest.Parse(JSON.parse(await readFile(join(dist.SIDE_DIST_PATH, 'meta', 'manifest'), 'utf-8')))
    if (manifest instanceof Error) throw manifest

    // 逐个激活依赖
    if (!options.disableRecursive && manifest.depends) {
        for (const dep in manifest.depends) {
            const pids = await QueryPackage(dep, manifest.depends[dep])
            if (pids.length === 0) {
                throw new Error('Package ' + dep + ':' + manifest.depends[dep] + ' not found')
            }
            const pid = PackageId.Parse(pids[0])
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
        const files = (await promisify(exec)(`find ${dist.SIDE_DIST_ROOT} -type f -printf "%P\\n"`))
            .stdout.split('\n')
            .filter(file => {
                if (manifest.deploy.excludes) return !manifest.deploy.excludes.some(exclude => file.startsWith(exclude))
                if (manifest.deploy.includes) return manifest.deploy.includes.some(include => file.startsWith(include))
                return true
            })
        for (const file of files) {
            await mkdir(dirname(join(project.path, PROJECT.RPATH.SYSROOT, file)), { recursive: true })
            await promisify(exec)(`ln -rsf ${join(dist.SIDE_DIST_ROOT, file)} ${join(project.path, PROJECT.RPATH.SYSROOT, file)}`)
        }
    } break
    case 'hlink': {
        // 定位源路径下所有的文件
        const files = (await promisify(exec)(`find ${dist.SIDE_DIST_ROOT} -type f -printf "%P\\n"`))
            .stdout.split('\n')
            .filter(file => {
                if (manifest.deploy.excludes) return !manifest.deploy.excludes.some(exclude => file.startsWith(exclude))
                if (manifest.deploy.includes) return manifest.deploy.includes.some(include => file.startsWith(include))
                return true
            })
        for (const file of files) {
            await mkdir(dirname(join(project.path, PROJECT.RPATH.SYSROOT, file)), { recursive: true })
            await promisify(exec)(`ln -f ${join(dist.SIDE_DIST_ROOT, file)} ${join(project.path, PROJECT.RPATH.SYSROOT, file)}`)
        }
    } break
    case 'copy': {
        // 定位源路径下所有的文件
        const files = (await promisify(exec)(`find ${dist.SIDE_DIST_ROOT} -type f -printf "%P\\n"`))
            .stdout.split('\n')
            .filter(file => {
                if (manifest.deploy.excludes) return !manifest.deploy.excludes.some(exclude => file.startsWith(exclude))
                if (manifest.deploy.includes) return manifest.deploy.includes.some(include => file.startsWith(include))
                return true
            })
        for (const file of files) {
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
    if (!await IsPackageInstalled(packageId)) {
        console.verbose('package %s not installed, skiped', packageId.toString())
        return
    }

    // 尝试调用卸载脚本
    if (0 !== await invokePackageHook(packageId, 'uninstall')) {
        throw new Error('Failed to invoke uninstall script')
    }

    await promisify(exec)('rm -rf ' + packageId.dist.SIDE_DIST_PATH)
}

export async function invokePackageHook(packageId: PackageId, hook: string, fail_on_missing = false) {
    const dist = packageId.dist
    const script = join(dist.SIDE_DIST_PATH, 'hook', hook)

    try {
        await access(script)
    } catch {
        console.verbose('package hook %s not found, skiped', hook)
        return fail_on_missing ? 1 : 0
    }

    await promisify(exec)(`chmod +x ${script}`)
    const env = inflate(vmerge(Project.This().exports, dist), getEnvBackup())
    console.verbose('invoke hook %s', script)
    const child = spawn(script, {
        env,
        stdio: 'inherit',
        shell: '/bin/bash',
        cwd: dist.SIDE_DIST_PATH
    })

    return new Promise<number>((resolve) => {
        child.on('exit', code => {
            if (code !== 0)
                console.error('package hook %s exited with code %d', script, code)
            resolve(code)
        })
    })
}