import { Feature } from '@godgnidoc/decli'
import { SidePlatform } from 'platform'

export const userMeFeature = new class extends Feature {
    brief = 'Get information about the current user'
    description = 'Get information about the current user'

    entry() {
        const user = SidePlatform.settings.dist.user
        if (!user) return 1
        console.log(user)
        return 0
    }
}