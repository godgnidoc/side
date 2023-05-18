import {  stat } from 'fs/promises'

export async function IsDir(path: string) {
    try {
        return (await stat(path)).isDirectory()
    } catch {
        return false
    }
}

export async function IsFile(path: string) {
    try {
        return (await stat(path)).isFile()
    } catch {
        return false
    }
}

/**
 * 为文件名匹配路径通配符
 * @param fname 文件名
 * @param pattern 路径通配符，支持 * 和 ?，* 匹配任意字符，? 匹配单个字符
 */
export function MatchPattern(fname: string, pattern: string) {
    let i = 0, j = 0
    while (i < fname.length && j < pattern.length) {
        if (pattern[j] === '*') {
            j++
            while (i < fname.length && fname[i] !== pattern[j]) i++
        } else if (pattern[j] === '?') {
            i++
            j++
        } else {
            if (fname[i] !== pattern[j]) return false
            i++
            j++
        }
    }
    return i === fname.length && j === pattern.length
}