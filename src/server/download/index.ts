import { createReadStream } from "fs"
import { stat } from "fs/promises"
import { RequestContext } from "jetweb"
import { isAbsolute, join, relative } from "path"
import { SidePlatform } from "platform"

export async function getDl(this: RequestContext, p: string) {
    p = join(SidePlatform.server.downloadable, p)

    try {
        const rp = relative(SidePlatform.server.downloadable, p)
        if (rp.startsWith('..') || isAbsolute(rp)) {
            this.response.statusCode = 403
            this.response.end()
        }

        const st = await stat(p)
        this.response.writeHead(200, {
            'Content-Length': st.size,
        })
        const rs = createReadStream(p)
        rs.pipe(this.response, { end: true })
        return new Promise(resolve => {
            rs.on('end', () => {
                console.debug('dl:File %s sent', p)
                resolve(undefined)
            })
        })
    } catch (e) {
        this.response.statusCode = 404
        this.response.end()
    }
}