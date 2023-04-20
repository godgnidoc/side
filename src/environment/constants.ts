import { readFileSync, statSync } from "fs"
import { dirname, join } from "path"

function locatePackageJson() {
    let dir = dirname(new URL(import.meta.url).pathname)
    while (dir !== '/') {
        if (statSync(join(dir, 'package.json'), { throwIfNoEntry: false })?.isFile())
            return dir
        dir = join(dir, '..')
    }
    throw new Error('Cannot locate package.json')
}

export const Here = locatePackageJson()
export const NodeManifest = JSON.parse(readFileSync(join(Here, 'package.json'), 'utf8'))
export const SideVersion = NodeManifest.version
export const SideRevision = NodeManifest.revision