import { createHash } from 'crypto'

/**
 * 为指定字符串计算md5值
 */
export function md5(str: string) {
    const hash = createHash('md5')
    hash.update(str)
    return hash.digest('hex')
}
