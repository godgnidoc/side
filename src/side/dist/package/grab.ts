import { Feature } from "@godgnidoc/decli"
import { FetchPackage, IsPackageExists, IsPackageUpToDate } from "disting"
import { IsFile } from "filesystem"
import { Cache, Dictate, PackageId, loadJson } from "format"
import { isAbsolute, join, relative } from "path"
import { SidePlatform } from "platform"
import { api } from "dist/api"
import { promisify } from "util"
import { exec } from "child_process"
import { writeFile } from "fs/promises"

class DistGrabFeature extends Feature {
    args = '<dictate-file> [output-file-name]'
    brief = 'Grab dependencies according to specified dependency dictate file'
    description = 'Grab dependencies according to specified dependency dictate file\n'

    async entry(dictateFile: string, outputFileName?: string) {
        if (!outputFileName) outputFileName = 'packages.tar'
        if (!isAbsolute(outputFileName)) {
            outputFileName = join(process.cwd(), outputFileName)
        }

        const cachePath = join(SidePlatform.paths.caches, 'index.json')
        const cache = (await IsFile(cachePath))
            ? await loadJson<Cache>(cachePath, 'Cache')
            : undefined

        const dictate = await loadJson<Dictate>(dictateFile, 'Dictate')
        const needed: Cache = {}
        for (const id in dictate) {
            const packageId = PackageId.FromString(id)
            if (packageId instanceof Error) throw packageId

            const baseStat = dictate[id]
            const localUpToDate = (cache !== undefined && await IsPackageExists(packageId) && await IsPackageUpToDate(packageId))

            let { size, mtime } = localUpToDate
                ? cache[id]
                : (await api.package.stat(id)).data

            if (size === undefined || mtime === undefined) {
                console.error(`Failed to grab ${id}`)
                return 1
            }

            if (!baseStat || baseStat.size !== size || baseStat.mtime !== mtime) {
                needed[id] = { size, mtime }
            }
        }


        if (Object.keys(needed).length === 0) {
            console.log('Grab: no needed package')
            return 0
        }

        console.log('Grab packages: ')
        for (const id in needed) {
            console.log('    %s size=%d mtime=%d', id, needed[id].size, needed[id].mtime)
        }

        const packages: string[] = []
        for (const id in needed) {
            const packageId = PackageId.FromString(id)
            if (packageId instanceof Error) throw packageId

            packages.push(relative(
                SidePlatform.paths.caches,
                await FetchPackage(packageId)
            ))
        }

        const cmd = `tar -cf ${outputFileName} ${packages.join(' ')}`
        await promisify(exec)(cmd, {
            cwd: SidePlatform.paths.caches
        })

        await writeFile('grab-index.json', JSON.stringify(needed, undefined, 4))
        const rcmd = `tar -rf ${outputFileName} grab-index.json`
        await promisify(exec)(rcmd)

        return 0
    }
}

export const distGrabFeature = new DistGrabFeature