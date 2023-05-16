import { Feature } from '@godgnidoc/decli'
import { exec } from 'child_process'
import { FetchPackage } from './common'
import { mkdir } from 'fs/promises'
import { promisify } from 'util'
import { PackageId } from 'format'

class DistGetFeature extends Feature {
    args = '<package> [folder]'
    brief = 'Get package'
    description = 'Get package from remote repository or cache\n'
        + '  package: package id\n'
        + '  folder: folder to save the package, default to local dist repository\n\n'
        + '  If the package is already in cache, it will be copied to the folder.\n'
        + '  If the package is not in cache, it will be downloaded from remote repository.\n'

    async entry(pack: string, folder?: string) {

        const packageId = PackageId.Parse(pack)
        if (packageId instanceof Error) {
            console.error('Invalid package id: %s', pack)
            return 1
        }

        const raw = await FetchPackage(packageId)
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

export const distGetFeature = new DistGetFeature()