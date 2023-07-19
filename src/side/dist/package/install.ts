import { Brief, Feature, LongOpt, ShortOpt } from '@godgnidoc/decli'
import { InstallPackage, QueryPackage } from 'disting'
import { IsValidQuery, PackageId } from 'format'
import { api } from 'dist/api'

class DistInstallFeature extends Feature {
    args = '<package-id|package-query>'
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
        const packageId = await (async () => {
            if (IsValidQuery(id)) {
                const result = await QueryPackage(id, undefined, {
                    ignoreLock: true,
                    skipSave: true
                })
                if (result.length === 0) {
                    return new Error('No package found')
                }
                console.info('Selecting %s', result[0])
                return PackageId.FromString(result[0])
            } else {
                return PackageId.FromString(id)
            }
        })()

        if (packageId instanceof Error) {
            console.error(packageId.message)
            return 1
        }

        await InstallPackage(packageId, {
            disableAutos: this.disableAutos,
            ignoreCache: this.ignoreCache,
            forceUnpack: this.forceUnpack,
            forceInstall: this.forceInstall,
            ignoreLock: true,
            skipSave: true,
        })

        return 0
    }
}
export const distInstallFeature = new DistInstallFeature()