import { PackageId } from 'format'
import { done, invalidArgument } from 'server/utils'
import { readFile, stat } from 'fs/promises'
import { IsExist } from 'filesystem'

export async function getStat(id: string) {
    const packageId = PackageId.FromString(id)
    if (packageId instanceof Error) return invalidArgument(packageId.message)

    if (!await IsExist(packageId.path)) {
        return invalidArgument('Package ' + id + ' not found')
    }

    const st = await stat(packageId.path)
    const manifest = JSON.parse(await readFile(packageId.manifestPath, 'utf-8'))
    return done({
        id: packageId.toString(),
        size: st.size,
        mtime: st.mtimeMs,
        manifest,
    })
}