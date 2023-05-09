import { readFile, mkdir, stat, writeFile } from "fs/promises"
import { createWriteStream } from "fs"
import { load } from "js-yaml"
import { join } from "path"

import { PackingManifest, Cache, PackageId } from "format"
import { api } from "../api"
import { PROJECT, Project } from "project"
import { SidePlatform } from "platform"

export function selectPackingManifest(path?: string) {
    if (!path) return join(Project.This().path, PROJECT.RPATH.TARGET)
    return path
}

export function selectReleasePath() {
    return join(Project.This().path, Project.This().manifest.dirs.RELEASE)
}

export async function loadPackingManifest(path: string) {
    const packingManifest = PackingManifest.Parse(load(await readFile(path, 'utf8')))
    if (packingManifest instanceof Error) throw packingManifest
    return packingManifest.packing
}

export async function IsPackageUpToDate(packageId: PackageId) {
    const id = packageId.toString()
    try {
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
    } catch (e) {
        console.verbose('IsPackageUpToDate: %s', e.message)
        return false
    }
}

export async function getPackage(id: string) {
    const packageId = PackageId.Parse(id)
    if (packageId instanceof Error) return packageId

    // 检查缓冲，判断是否需要下载
    if (await IsPackageUpToDate(packageId)) {
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