import { Brief, Feature, LongOpt, ShortOpt } from "@godgnidoc/decli"
import { InstallPackage, QueryPackage } from "disting"
import { PackageId } from "format"
import { SidePlatform } from "platform"
import { SemVer, lte } from "semver"

class UpdateFeature extends Feature {
    brief = 'Update or check update for side'
    description = 'Update or check update for side'

    @Brief('check update')
    @ShortOpt('-c') @LongOpt('--check')
    checkOnly = false

    async entry() {
        if (SidePlatform.settings.offline) {
            console.verbose('offline mode, skip checking update')
            return 0
        }

        console.verbose('checking update')
        const result = await QueryPackage('@platform/side', undefined, {
            ignoreLock: true,
            skipSave: true
        })
        if (result.length === 0) {
            console.verbose('no update found')
            return 0
        }
        const latest = PackageId.FromString(result[0])
        if (latest instanceof Error) {
            console.error(latest.message)
            return 1
        }

        console.verbose('latest version: %s', latest.version.format())

        const current = new SemVer(SidePlatform.version)
        console.verbose('current version: %s', current.format())

        if (lte(latest.version, current)) {
            console.verbose('no newer version found')
            return 0
        }

        if (this.checkOnly) {
            const upper = '┌─────────────────────────────────────────────┐'
            const icon1 = '│                __ _     _                   │'
            const icon2 = '│                / _(_) __| | ___             │'
            const icon3 = '│                \\ \\| |/ _` |/ _ \\            │'
            const icon4 = '│                _\\ \\ | (_| |  __/            │'
            const icon5 = '│                \\__/_|\\__,_|\\___|            │'
            const icon6 = '│                                             │'
            const lower = '└─────────────────────────────────────────────┘'

            let line1 = '│ An update of side is available: ' + latest.version.format()
            let line2 = '│ You can update side by running: side update'

            line1 += ' '.repeat(upper.length - line1.length - 1) + '│'
            line2 += ' '.repeat(upper.length - line2.length - 1) + '│'
            line1 = line1.replace(latest.version.format(), '\x1b[1;32m' + latest.version.format() + '\x1b[0m')
            line2 = line2.replace('side update', '\x1b[1;32mside update\x1b[0m')

            console.log(upper)
            console.log(icon1)
            console.log(icon2)
            console.log(icon3)
            console.log(icon4)
            console.log(icon5)
            console.log(icon6)
            console.log(line1)
            console.log(line2)
            console.log(lower)
        } else {
            console.log('Updating side to %s', latest.version.format())
            await InstallPackage(latest, {
                ignoreLock: true,
                skipSave: true,
            })
        }

        return 0
    }
}
export const updateFeature = new UpdateFeature