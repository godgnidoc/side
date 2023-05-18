import { RequestContext } from 'jetweb'
import { join } from 'path'
import { SidePlatform } from 'platform'
import { readFile } from 'fs/promises'
import { RepoManifest, UserManifest, loadJson } from 'format'

export async function IsContributor(repoPath: string, user: string): Promise<boolean> {
    try {
        const manifest: RepoManifest = await loadJson(join(repoPath, 'manifest'), 'RepoManifest')
        return manifest.contributors.includes(user)
    } catch(e) {
        console.error(e)
        return false
    }
}

export async function IsOwner(repoPath: string, user: string): Promise<boolean> {
    try {
        const manifest: RepoManifest = await loadJson(join(repoPath, 'manifest'), 'RepoManifest')
        return manifest.contributors[0] === user
    } catch {
        return false
    }
}

export async function authorize(requestContext: RequestContext): Promise<UserManifest | null> {
    const rawAuthToken = requestContext.request.incomingMessage.headers['login-token']?.toString()
    if (!rawAuthToken) return null

    const authToken = Buffer.from(rawAuthToken, 'base64').toString('utf-8')
    console.debug('auth token: %s', authToken)
    const [, user, token] = authToken.match(/^(.*):(.*)$/)

    try {
        const pathUserHome = join(SidePlatform.server.contributors, user)
        const rawToken = await readFile(join(pathUserHome, 'token'), 'utf-8')

        if (rawToken.toString() === token) {
            return await loadJson<UserManifest>(join(pathUserHome, 'info'), 'UserManifest')
        }
    } catch {
        return null
    }
}