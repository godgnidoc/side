import { FileDB, ServerManifest } from "format"
import { SidePlatform } from "platform"
import { done, fail } from "server/utils"


export async function getWhich(usage: string) {
    const manifest = await FileDB.OpenOrCreate<ServerManifest>(SidePlatform.server.manifest, {}, {
        format: 'yaml',
        schema: 'ServerManifest'
    })

    const repo = manifest.usages?.[usage]
    if (!repo) return fail(1, 'I have no idea')

    return done(repo)
}