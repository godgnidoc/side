import { Brief, Feature, LongOpt, ShortOpt } from '@godgnidoc/decli'
import { InstallPackage } from './common'
import { PackageId } from 'format'

class DistInstallFeature extends Feature {
    args = '<package>'
    brief = 'Install package'
    description = 'Install package\n'

    @Brief('Disable auto fetching or auto unpacking')
    @LongOpt('--disable-autos') @ShortOpt('-A')
        disableAutos = false

    @Brief('Ignore local caches to fetch')
    @LongOpt('--ignore-cache') @ShortOpt('-C')
        ignoreCache = false

    @Brief('Force unpack')
    @LongOpt('--force-unpack') @ShortOpt('-u')
        forceUnpack = false

    @Brief('Force install')
    @LongOpt('--force-install') @ShortOpt('-i')
        forceInstall = false

    async entry(id: string) {
        const packageId = PackageId.Parse(id)
        if (packageId instanceof Error) {
            console.error(packageId.message)
            return 1
        }

        await InstallPackage(packageId, {
            disableAutos: this.disableAutos,
            ignoreCache: this.ignoreCache,
            forceUnpack: this.forceUnpack,
            forceInstall: this.forceInstall
        })

        return 0
    }
}
export const distInstallFeature = new DistInstallFeature()