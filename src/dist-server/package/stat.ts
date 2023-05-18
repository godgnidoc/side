import { PackageId } from 'format'
import { done, invalidArgument } from 'server/utils'
import { stat } from 'fs/promises'

export async function getStat(id: string) {
    const packageId = PackageId.FromString(id)
    if (packageId instanceof Error) return invalidArgument(packageId.message)

    try {
        const st = await stat(packageId.path)
        return done({
            id: packageId.toString(),
            size: st.size,
            mtime: st.mtimeMs
        })
    } catch (e) {
        return invalidArgument('Package ' + id + ' not found')
    }
}