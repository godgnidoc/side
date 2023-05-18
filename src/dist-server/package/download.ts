import { PackageId } from 'format'
import { done, invalidArgument } from 'server/utils'
import { stat } from 'fs/promises'
import { RequestContext } from 'jetweb'
import { CreateTask } from 'server/task'
import { createReadStream } from 'fs'

async function TaskCallbackDownload(this: RequestContext, path: string) {
    this.response.writeHead(200)
    const rs = createReadStream(path)
    rs.pipe(this.response, { end: true })
    return new Promise(resolve => {
        rs.on('end', () => {
            console.debug('File %s sent', path)
            resolve(undefined)
        })
    })
}

export async function getDownload(id: string) {
    const packageId = PackageId.FromString(id)
    if (packageId instanceof Error) return invalidArgument(packageId.message)

    try {
        const st = await stat(packageId.path)
        return done({
            id: packageId.toString(),
            size: st.size,
            mtime: st.mtimeMs,
            token: CreateTask(TaskCallbackDownload, [packageId.path], undefined)
        })
    } catch (e) {
        return invalidArgument('Package ' + id + ' not found')
    }
}