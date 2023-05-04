import { RequestContext } from 'jetweb'
import { join } from 'path'
import { PATH_CONTRIBUTORS } from 'environment'
import { readFile } from 'fs/promises'
import { RepoManifest, UserInfo } from 'format'

export async function IsContributor(repo_path: string, user: string): Promise<boolean> {
    try {
        const raw_manifest = await readFile(join(repo_path, 'manifest'), 'utf-8')
        const manifest: RepoManifest = RepoManifest.Parse(JSON.parse(raw_manifest.toString()))
        return manifest.contributors.includes(user)
    } catch {
        return false
    }
}

export async function IsOwner(repo: string, user: string): Promise<boolean> {
    const path_repo = join(PATH_CONTRIBUTORS, repo)
    try {
        const raw_manifest = await readFile(join(path_repo, 'manifest'), 'utf-8')
        const manifest: RepoManifest = RepoManifest.Parse(JSON.parse(raw_manifest.toString()))
        return manifest.contributors[0] === user
    } catch {
        return false
    }
}

export async function authorize(requestContext: RequestContext): Promise<UserInfo | null> {
    const raw_auth_token = requestContext.request.incomingMessage.headers['login-token']?.toString()
    if (!raw_auth_token) return null

    const auth_token = Buffer.from(raw_auth_token, 'base64').toString('utf-8')
    console.debug('auth token: %s', auth_token)
    const [, user, token] = auth_token.match(/^(.*):(.*)$/)

    try {
        const path_user_home = join(PATH_CONTRIBUTORS, user)
        const raw_token = await readFile(join(path_user_home, 'token'), 'utf-8')

        if (raw_token.toString() === token) {
            const raw_info = await readFile(join(path_user_home, 'info'), 'utf-8')
            return UserInfo.Parse(JSON.parse(raw_info.toString()))
        }
    } catch {
        return null
    }
}