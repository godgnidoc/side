/**
 * @schema Cache
 */
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

/**
 * @schema Dictate
 */
export interface Dictate {
    /**
     * 依赖的包描述，键为包ID
     * 若值为 null，表示本地没有该包的缓存
     * 若值为对象，表示本地有该包的缓存，且对象中的字段为缓存信息
     */
    [packageId: string]: null | {
        /** 本地保存的最后修改时间 */
        lmtime: number

        /** 本地保存的文件大小 */
        lsize: number
    }
}