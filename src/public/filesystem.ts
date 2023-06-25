import { access, readdir, stat } from 'fs/promises'
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

export async function IsExist(path: string) {
    try {
        await access(path)
        return true
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
 * @param options.collapse 是否折叠包含全部文件的目录
 * @returns 返回所有被找到的文件相对于dir的路径
 */
export async function Find(
    dir: string,
    options?: { collapse?: boolean } & (
        { includes?: string[] }
        | { excludes?: string[] })) {
    const tasks = ['.']
    const files: string[] = []

    console.verbose('find: base dir=%s', dir)
    NEXT: while (tasks.length) {
        const task = tasks.pop()!
        const target = resolve(join(dir, task))

        if (await IsFile(target)) {
            if (typeof options == 'object' && 'includes' in options) {
                if (options.includes.every(include => relative(join(dir, include), target).startsWith('..'))) {
                    console.verbose('find: excluded %s', target)
                    continue NEXT
                }
            } else if (typeof options == 'object' && 'excludes' in options) {
                if (options.excludes.some(exclude => !relative(join(dir, exclude), target).startsWith('..'))) {
                    console.verbose('find: excluded %s', target)
                    continue NEXT
                }
            }

            files.push(task)
            continue NEXT
        }

        // 判断此路径是否应当被过滤
        if (typeof options == 'object' && 'includes' in options) {
            for (const inc of options.includes) {
                const include = join(dir, inc)
                const rel = relative(include, target)
                if (rel.startsWith('..') && relative(target, include).startsWith('..')) continue

                if (rel === '' && options.collapse === true) {
                    console.verbose('find: collapsed(full included) %s', target)
                    files.push(task)
                    continue NEXT
                }

                const entries = await readdir(target)
                tasks.push(...entries.map(entry => join(task, entry)))
                continue NEXT
            }
            console.verbose('find: excluded %s', target)
        } else if (typeof options == 'object' && 'excludes' in options) {
            let inner = false
            for (const exc of options.excludes) {
                const exclude = join(dir, exc)
                const rel = relative(exclude, target)
                if (rel.startsWith('..') && relative(target, exclude).startsWith('..')) continue

                if (!rel.startsWith('..')) {
                    console.verbose('find: excluded %s', target)
                    continue NEXT
                }

                inner = true
            }

            if (inner === false && options.collapse === true) {
                console.verbose('find: collapsed(not at all excluded) %s', target)
                files.push(task)
                continue NEXT
            }

            const entries = await readdir(target)
            tasks.push(...entries.map(entry => join(task, entry)))
        } else {
            if (options?.collapse === true) {
                console.verbose('find: collapsed(no condition) %s', target)
                files.push(task)
                continue NEXT
            }

            const entries = await readdir(target)
            tasks.push(...entries.map(entry => join(task, entry)))
        }
    }

    return files
}