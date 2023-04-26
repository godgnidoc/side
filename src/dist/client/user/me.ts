import { Feature } from "@godgnidoc/decli"
import { getFinalSettings } from "../../../environment"

export const userMeFeature = new class extends Feature {
    brief = "Get information about the current user"
    description = "Get information about the current user"

    entry() {
        const settings = getFinalSettings()
        const user = settings.dist.user
        if (!user) return 1
        console.log(user)
        return 0
    }
}