import { PackageId } from "format"
import { done, invalid_argument } from "../utils"
import { stat } from "fs/promises"

export async function getStat(id: string) {
    const package_id = PackageId.Parse(id)
    if (package_id instanceof Error) return invalid_argument(package_id.message)

    try {
        const st = await stat(package_id.path)
        return done({
            id: package_id.toString(),
            size: st.size,
            mtime: st.mtimeMs
        })
    } catch (e) {
        return invalid_argument('Package ' + id + ' not found')
    }
}