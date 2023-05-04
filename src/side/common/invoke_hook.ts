import { join } from "path"
import { fullyInflateEnv, loadFinalTarget, projectPath, rpaths } from "environment"
import { stat, access, readdir } from "fs/promises"
import { exec, spawn } from "child_process"
import { promisify } from "util"
import { Feature } from "@godgnidoc/decli"

/**
 * 调用钩子脚本，如果钩子不存在则返回 0  
 * 若针对当前目标存在特化钩子，则调用特化钩子  
 * 执行钩子前会将其权限设置为可执行
 * @param hook 钩子名称
 * @param args 传递给钩子的参数
 * @returns 钩子的返回值
 */
export async function invokeHook(hook: string, args: string[] = []) {
    if (!projectPath) return 0

    let script = join(projectPath, rpaths.projectScripts, hook)
    const target = loadFinalTarget()?.target

    if (target) {
        try {
            const targetScript = join(projectPath, rpaths.projectScripts, hook + '-' + target)
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
    console.debug('invoke: %s %s', script, args.join(' '))
    fullyInflateEnv()
    const child = spawn(script, args, {
        cwd: projectPath,
        env: process.env,
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

export const invokeHookFeature = new class extends Feature {
    args = '<hook> [args...]'
    brief = 'Invoke hook scripts'
    description = 'Invoke the specified hook script with given arguments'

    complete = async (editing: boolean, args: string[]) => {
        if (args.length > 1) return []
        try {
            const hooks = await readdir(join(projectPath, rpaths.projectScripts))
            if (editing) return hooks.filter(hook => hook.startsWith(args[0]))
            return hooks
        } catch {
            console.verbose('no hook script found')
            return []
        }
    }

    async entry(...args: string[]): Promise<number> {
        if (args.length === 0) return console.error('no hook script specified'), 1

        const name = args.shift()
        let script = join(projectPath, rpaths.projectScripts, name)
        try {
            await access(script)
        } catch {
            return console.error('hook script %s not found', script), 1
        }

        await promisify(exec)(`chmod +x ${script}`)
        fullyInflateEnv()
        console.debug('invoke: %s %s', script, args.join(' '))
        const child = spawn(script, args, {
            cwd: projectPath,
            env: process.env,
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
}