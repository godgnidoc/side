import { Brief, Feature, LongOpt } from "@godgnidoc/decli"
import { distPackFeature } from "./pack"
import { api } from "../api"

class DistPublishFeature extends Feature {
    args = '<version> [manifest]'
    brief = 'Pack and publish a package'
    description = 'Pack and publish a package\n'
        + '  version: version of the package\n'
        + '  manifest: path to the manifest file, default to final target of the project'

    @Brief('Allow overwrite existing package')
    @LongOpt('--allow-overwrite')
    allowOverwrite = false

    @Brief('Allow downgrade published package')
    @LongOpt('--allow-downgrade')
    allowDowngrade = false

    async entry(...args: string[]): Promise<number> {
        if (0 !== await distPackFeature.entry(...args))
            return 1

        const file = distPackFeature.package
        const id = distPackFeature.packageid
        console.debug('publishing %s', file)

        const res = await api.package.publish(file, id, this.allowOverwrite, this.allowDowngrade)
        if (res.status !== 0) {
            console.error('Publish failed: %s', res.message)
            return 1
        }

        return 0
    }
}
export const distPublishFeature = new DistPublishFeature