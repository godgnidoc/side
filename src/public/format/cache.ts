export interface Cache {
    [id: string]: {
        mtime: number
        size: number
        lmtime: number
        lsize: number
    }
}