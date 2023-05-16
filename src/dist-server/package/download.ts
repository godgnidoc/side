import { PackageId } from 'format'
import { done, invalid_argument } from '../utils'
import { stat } from 'fs/promises'
import { RequestContext } from 'jetweb'
import { CreateTask } from '../task'
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
    const packageId = PackageId.Parse(id)
    if (packageId instanceof Error) return invalid_argument(packageId.message)

    try {
        const st = await stat(packageId.path)
        return done({
            id: packageId.toString(),
            size: st.size,
            mtime: st.mtimeMs,
            token: CreateTask(TaskCallbackDownload, [packageId.path], undefined)
        })
    } catch (e) {
        return invalid_argument('Package ' + id + ' not found')
    }
}