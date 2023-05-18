import { RequestContext } from 'jetweb'
import { join } from 'path'
import { SidePlatform } from 'platform'
import { readFile } from 'fs/promises'
import { RepoManifest, UserInfo, loadJson } from 'format'

export async function IsContributor(repoPath: string, user: string): Promise<boolean> {
    try {
        const manifest: RepoManifest = await loadJson(join(repoPath, 'manifest'), 'RepoManifest')
        return manifest.contributors.includes(user)
    } catch {
        return false
    }
}

export async function IsOwner(repo: string, user: string): Promise<boolean> {
    const pathRepo = join(SidePlatform.server.contributors, repo)
    try {
        const manifest: RepoManifest = await loadJson(join(pathRepo, 'manifest'), 'RepoManifest')
        return manifest.contributors[0] === user
    } catch {
        return false
    }
}

export async function authorize(requestContext: RequestContext): Promise<UserInfo | null> {
    const rawAuthToken = requestContext.request.incomingMessage.headers['login-token']?.toString()
    if (!rawAuthToken) return null

    const authToken = Buffer.from(rawAuthToken, 'base64').toString('utf-8')
    console.debug('auth token: %s', authToken)
    const [, user, token] = authToken.match(/^(.*):(.*)$/)

    try {
        const pathUserHome = join(SidePlatform.server.contributors, user)
        const rawToken = await readFile(join(pathUserHome, 'token'), 'utf-8')

        if (rawToken.toString() === token) {
            return await loadJson<UserInfo>(join(pathUserHome, 'info'), 'UserInfo')
        }
    } catch {
        return null
    }
}