import { Brief, Compgen, Feature, LongOpt } from '@godgnidoc/decli'
import { api } from 'dist/api'
import { promisify } from 'util'
import { exec } from 'child_process'
import { PackageManifest, getLastValidateErrorText, validateSync } from 'format'
import { stat } from 'fs/promises'
import { createReadStream } from 'fs'
import * as pstream from 'progress-stream'
import * as progress from 'progress'

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
            const manifest = JSON.parse(raw.stdout)
            if (!validateSync<PackageManifest>(manifest, 'PackageManifest'))
                throw new Error(getLastValidateErrorText('PackageManifest'))
            if (manifest instanceof Error) throw manifest

            const { size } = await stat(path)
            const rs = createReadStream(path)
            const str = pstream({ length: size, time: 100 })
            const bar = new progress(`publish:    uploading ${manifest.packageId} [:bar] :percent :etas`, {
                complete: '>',
                incomplete: ' ',
                width: 20,
                total: size,
            })
            str.on('progress', p => bar.tick(p.delta))
            const res = await api.package.publish(manifest, rs.pipe(str), this.allowOverwrite, this.allowDowngrade)
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
export const distPublishFeature = new DistPublishFeature()