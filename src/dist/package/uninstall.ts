import { Feature } from "@godgnidoc/decli"
import { exec } from "child_process"
import { PackageId } from "format"
import { access } from "fs/promises"
import { inflate } from "inflate"
import { join } from "path"
import { promisify } from "util"

export const distUninstallFeature = new class extends Feature {
    args = '<package>'
    brief = 'Uninstall package'
    description = 'Uninstall package\n'

    async entry(id: string) {
        const packageId = PackageId.Parse(id)
        if (packageId instanceof Error) {
            console.error(packageId.message)
            return 1
        }

        const dist = packageId.dist
        try {
            await access(join(dist.SIDE_DIST_PATH))
        } catch (e) {
            console.warn(`Package ${id} not installed`)
            return 1
        }

        try {
            const script = join(dist.SIDE_DIST_PATH, 'hook', 'uninstall')
            await access(script)
            await promisify(exec)(`chmod +x ${script}`)
            const env = inflate(dist, { ...process.env })
            try {
                console.verbose('invoke hook %s', script)
                const stdio = await promisify(exec)(script, { cwd: dist.SIDE_DIST_ROOT, env })
                console.verbose(stdio.stdout)
            } catch (e) {
                console.error(e)
                return 1
            }
        } catch {
            // ignore
        }

        await promisify(exec)('rm -rf ' + dist.SIDE_DIST_PATH)
        return 0
    }
}