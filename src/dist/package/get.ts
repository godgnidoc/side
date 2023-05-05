import { Feature } from "@godgnidoc/decli"
import { exec } from "child_process"
import { rpaths, sideHome } from "environment"
import { Cache, PackageId } from "format"
import { mkdir, readFile, stat, writeFile } from "fs/promises"
import { join } from "path"
import { promisify } from "util"
import { api } from "../api"
import { createWriteStream } from "fs"

export async function IsPackageUpToDate(packageId: PackageId) {
    const id = packageId.toString()
    try {
        console.verbose('stat package : %s', id)
        const lstat = await stat(packageId.lpath)
        console.verbose('Local stat: size=%s mtime=%s', lstat.size, lstat.mtimeMs)

        const index: Cache = JSON.parse(await readFile(join(sideHome, rpaths.sideCaches, 'index.json'), 'utf-8'))
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

export async function getPackage(id: string): Promise<string | Error> {
    const packageId = PackageId.Parse(id)
    if (packageId instanceof Error) return packageId

    // 检查缓冲，判断是否需要下载
    let up_to_date = await IsPackageUpToDate(packageId)
    if (up_to_date) {
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
        index = JSON.parse(await readFile(join(sideHome, rpaths.sideCaches, 'index.json'), 'utf-8'))
    } catch {
        console.verbose('Failed to read cache index, creating new one')
    }
    index[id] = {
        mtime: download.data.mtime,
        size: download.data.size,
        lmtime: lstat.mtimeMs,
        lsize: lstat.size
    }
    await mkdir(join(sideHome, rpaths.sideCaches), { recursive: true })
    await writeFile(join(sideHome, rpaths.sideCaches, 'index.json'), JSON.stringify(index))

    return packageId.lpath
}

class DistGetFeature extends Feature {
    args = '<package> [folder]'
    brief = 'Get package'
    description = 'Get package from remote repository or cache\n'
        + '  package: package id\n'
        + '  folder: folder to save the package, default to local dist repository\n\n'
        + '  If the package is already in cache, it will be copied to the folder.\n'
        + '  If the package is not in cache, it will be downloaded from remote repository.\n'

    async entry(pack: string, folder?: string) {

        const raw = await getPackage(pack)
        if (raw instanceof Error) {
            console.error('Failed to get package %s: %s', pack, raw.message)
            return 1
        }

        if (folder) {
            await mkdir(folder, { recursive: true })
            await promisify(exec)(`cp -r ${raw} ${folder}/.`)
        }

        return 0
    }
}

export const distGetFeature = new DistGetFeature