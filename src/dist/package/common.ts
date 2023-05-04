import { defaultDirs, projectManifest, projectPath, rpaths } from "environment"
import { PackingManifest } from "format"
import { readFile } from "fs/promises"
import { load } from "js-yaml"
import { join } from "path"

export function selectPackingManifest(path?: string) {
    if (!path) return join(projectPath, rpaths.projectFinalTarget)
    return path
}

export function selectReleasePath() {
    return projectPath
        ? join(projectPath, projectManifest.dirs.release)
        : join(projectPath, defaultDirs.release)
}

export async function loadPackingManifest(path: string) {
    const packingManifest = PackingManifest.Parse(load(await readFile(path, 'utf8')))
    if (packingManifest instanceof Error) throw packingManifest
    return packingManifest.packing
}