import { Brief, Feature, LongOpt, ShortOpt } from '@godgnidoc/decli'
import { InstallPackage } from 'disting'
import { PackageId } from 'format'
import { api } from '../api'

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

    complete = async (editing: boolean, args: string[]) => {
        if (args.length === 0) return (await api.package.search('*')).data
        else if (args.length === 1 && editing) return (await api.package.search(args[0] + '*')).data
    }

    async entry(id: string) {
        const packageId = PackageId.FromString(id)
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