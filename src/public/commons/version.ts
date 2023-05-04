import { Feature } from "@godgnidoc/decli"
import { sideRevision, sideVersion } from "environment"

export const versionFeature = new class extends Feature {
    brief = "Show version information"
    description = "Show version information"
    entry() {
        console.log(`side - ${sideVersion} - ${sideRevision}`)
        return 0
    }
}