export interface Cache {
    [packageId: string]: {
        /** 服务端保存的最后修改时间 */
        mtime: number

        /** 服务端保存的文件大小 */
        size: number

        /** 本地保存的最后修改时间 */
        lmtime: number

        /** 本地保存的文件大小 */
        lsize: number
    }
}

/**
 * @schema DepLock
 */
export interface DepLock {
    [target: string]: {
        [packageQuery: string]: {
            version: string
        }
    }
}