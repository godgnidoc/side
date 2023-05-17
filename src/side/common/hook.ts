import { join } from 'path'
import { stat, access } from 'fs/promises'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { PROJECT, Project } from 'project'
import { inflate } from 'inflate'

/**
 * 调用钩子脚本，如果钩子不存在则返回 0  
 * 若针对当前目标存在特化钩子，则调用特化钩子  
 * 执行钩子前会将其权限设置为可执行
 * @param hook 钩子名称
 * @param args 传递给钩子的参数
 * @returns 钩子的返回值
 */
export async function invokeHook(hook: string, args: string[] = []) {
    if (!Project.This()) return 0

    let script = join(Project.This().path, PROJECT.RPATH.SCRIPTS, hook)
    const target = Project.This().target?.target

    if (target) {
        try {
            const targetScript = join(Project.This().path, PROJECT.RPATH.SCRIPTS, hook + '-' + target)
            if ((await stat(targetScript)).isFile())
                script = targetScript
        } catch (e) {
            // ignore
        }
    }

    /** 若文件不存在则视为无动作 */
    try { await access(script) } catch (e) { return 0 }
    console.verbose('invoke hook %s', script)

    await promisify(exec)(`chmod +x ${script}`)
    console.verbose('invoke: %s %s', script, args.join(' '))
    const child = spawn(script, args, {
        cwd: Project.This().path,
        env: inflate(Project.This().exports),
        stdio: 'inherit',
        shell: '/bin/bash'
    })

    return new Promise<number>((resolve) => {
        child.on('exit', code => {
            if (code !== 0)
                console.error('hook %s exited with code %d', script, code)
            resolve(code)
        })
    })
}