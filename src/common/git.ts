import { exec } from "child_process"
import { promisify } from "util"

/**
 * 获取当前工作目录的 git 仓库的当前提交
 * @param path 工作目录
 * @param options 选项
 * @param options.short 是否使用短 hash
 * @param options.dirty 是否在 hash 后添加 * 表示当前工作目录有未提交的修改
 * @returns 当前提交的 hash 值，如果不在 git 仓库中则返回 undefined
 */
export async function getRevision(path: string, options?: { short?: boolean, dirty?: boolean }) {
    const dirty = options?.dirty === true
    const short = options?.short === true
        ? '--short'
        : ''

    let revision = ''
    try {
        revision = (await promisify(exec)(`git rev-parse ${short} HEAD`, { cwd: path })).stdout.trim()
    } catch {
        return undefined
    }

    if (dirty) {
        try {
            await promisify(exec)(`git diff-index --quiet HEAD`, { cwd: path })
        } catch {
            revision += '*'
        }
    }

    return revision
}