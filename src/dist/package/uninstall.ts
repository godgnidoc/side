import { Feature } from "@godgnidoc/decli"
import { PackageId } from "format"
import { UninstallPackage } from "./common"

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

        await UninstallPackage(packageId)

        return 0
    }
}