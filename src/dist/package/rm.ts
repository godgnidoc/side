import { Feature } from "@godgnidoc/decli"
import { exec } from "child_process"
import { Cache, PackageId } from "format"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import { promisify } from "util"
import { distUninstallFeature } from "./uninstall"
import { SidePlatform } from "platform"

export const distRmFeature = new class extends Feature {
    args = '<package>'
    brief = 'Remove cached package'
    description = 'Remove cached package\n'

    async entry(id: string) {
        const packageId = PackageId.Parse(id)

        if (packageId instanceof Error) {
            console.error(packageId.message)
            return 1
        }

        await distUninstallFeature.entry(id)

        try {
            const index: Cache = JSON.parse(await readFile(join(SidePlatform.paths.caches, 'index.json'), 'utf-8'))
            delete index[packageId.toString()]
            await writeFile(join(SidePlatform.paths.caches, 'index.json'), JSON.stringify(index))
        } catch {
            // ignore
        }

        await promisify(exec)('rm -rf ' + packageId.lpath)

        return 0
    }
}