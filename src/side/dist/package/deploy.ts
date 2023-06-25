import { Feature } from "@godgnidoc/decli"
import { exec } from "child_process"
import { Cache, getLastValidateErrorText, validateSync } from "format"
import { readFile, writeFile } from "fs/promises"
import { vmerge } from "notion"
import { join } from "path"
import { SidePlatform } from "platform"
import { promisify } from "util"

class DistDeployFeature extends Feature {
    args = '<package-collection-file>'
    brief = 'Deploy packages'
    description = 'Deploy packages from specified package collection file\n'

    async entry(collection: string) {
        const rawGrabIndex = await promisify(exec)('tar -xOf ' + collection + ' grab-index.json')
        const grabIndex = JSON.parse(rawGrabIndex.stdout)
        if (!validateSync<Cache>(grabIndex, 'Cache'))
            throw new Error(getLastValidateErrorText('Cache'))

        console.log('Deploy packages: ')
        for (const id in grabIndex) {
            console.log('    %s size=%d mtime=%d', id, grabIndex[id].size, grabIndex[id].mtime)
        }

        const cmd = `tar -xf ${collection} -C ${SidePlatform.paths.caches} --exclude grab-index.json`
        await promisify(exec)(cmd)

        const indexPath = join(SidePlatform.paths.caches, 'index.json')

        try {
            const rawIndex = await readFile(indexPath, 'utf-8')
            const index = JSON.parse(rawIndex)
            if (!validateSync<Cache>(index, 'Cache'))
                throw new Error(getLastValidateErrorText('Cache'))
            await writeFile(indexPath, JSON.stringify(vmerge(index, grabIndex), null, 4))
        } catch {
            await writeFile(indexPath, JSON.stringify(grabIndex, null, 4))
        }

        return 0
    }
}

export const distDeployFeature = new DistDeployFeature