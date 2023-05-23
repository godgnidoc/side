import { readdir, stat } from 'fs/promises'
import { join, relative, resolve } from 'path'

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
            while (pattern[j] === '*') j++
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
    while (pattern[j] === '*' || pattern[j] === '?') j++
    return i === fname.length && j === pattern.length
}

/**
 * 递归查找目录下的文件
 * @param dir 目录
 * @param options 选项
 * @param options.includes 仅包含以此为路径前缀的文件
 * @param options.excludes 排除以此为路径前缀的文件
 * @returns 返回所有被找到的文件相对于dir的路径
 */
export async function Find(
    dir: string,
    options?: { includes?: string[] }
        | { excludes?: string[] }) {
    const tasks = ['.']
    const files: string[] = []

    console.verbose('find: base dir=%s', dir)
    while (tasks.length) {
        const task = tasks.pop()!
        const target = resolve(join(dir, task))

        // 判断此路径是否应当被过滤
        if (typeof options == 'object' && 'includes' in options) {
            if (options.includes.every(include => relative(join(dir, include), target).startsWith('../'))) {
                console.verbose('find: excluded %s', target)
                continue
            }
        } else if (typeof options == 'object' && 'excludes' in options) {
            if (options.excludes.some(exclude => !relative(target, join(dir, exclude)).startsWith('../'))) {
                console.verbose('find: exclude %s', target)
                continue
            }
        }

        if (await IsFile(target)) {
            // console.verbose('find: found %s', target)
            files.push(task)
            continue
        }

        const entries = await readdir(target, { withFileTypes: true })
        for (const entry of entries) {
            tasks.push(join(task, entry.name))
        }
    }

    return files
}