import { Feature } from '@godgnidoc/decli'
import { exec } from 'child_process'
import { Cache, PackageId } from 'format'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'
import { SidePlatform } from 'platform'
import { UninstallPackage } from 'disting'

export const distRmFeature = new class extends Feature {
    args = '<package>'
    brief = 'Remove cached package'
    description = 'Remove cached package\n'

    async entry(id: string) {
        const packageId = PackageId.FromString(id)

        if (packageId instanceof Error) {
            console.error(packageId.message)
            return 1
        }

        await UninstallPackage(packageId)

        try {
            const index: Cache = JSON.parse(await readFile(join(SidePlatform.paths.caches, 'index.json'), 'utf-8'))
            delete index[packageId.toString()]
            await writeFile(join(SidePlatform.paths.caches, 'index.json'), JSON.stringify(index))
        } catch (e) {
            console.verbose(e)
        }

        try {
            await promisify(exec)('rm -rf ' + packageId.localPath)

        } catch (e) {
            console.verbose(e)
        }

        try {
            await promisify(exec)('rm -rf ' + packageId.dist.SIDE_DIST_PATH)
        } catch (e) {
            console.verbose(e)
        }

        return 0
    }
}