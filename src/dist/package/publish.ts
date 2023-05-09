import { Brief, Compgen, Feature, LongOpt } from "@godgnidoc/decli"
import { api } from "../api"
import { promisify } from "util"
import { exec } from "child_process"
import { PackageManifest } from "format"

class DistPublishFeature extends Feature {
    args = '<path/to/package>'
    brief = 'Publish a packed package'
    description = 'Publish a packed package\n'
        + '  path/to/package: path to the package file'

    @Brief('Allow overwrite existing package')
    @LongOpt('--allow-overwrite')
    allowOverwrite = false

    @Brief('Allow downgrade published package')
    @LongOpt('--allow-downgrade')
    allowDowngrade = false

    complete = (editing: boolean, args: string[]) => {
        if (editing) return Compgen('file', args[args.length - 1])
        else return Compgen('file')
    }

    async entry(path: string): Promise<number> {
        if (!path) {
            console.error('Package file required')
            return 1
        }

        try {
            const raw = await promisify(exec)('tar -xOf ' + path + ' meta/manifest')
            const manifest = PackageManifest.Parse(JSON.parse(raw.stdout))
            if (manifest instanceof Error) throw manifest
            const res = await api.package.publish(manifest, path, this.allowOverwrite, this.allowDowngrade)
            if (res.status !== 0) {
                console.error('Publish failed: %s', res.message)
                return 1
            }
        } catch (e) {
            console.error('Failed to read package manifest: %s', e.message)
            return 1
        }

        return 0
    }
}
export const distPublishFeature = new DistPublishFeature