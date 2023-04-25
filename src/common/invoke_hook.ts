import { join } from "path";
import { getFinalTarget, projectPath, rpaths } from "../environment";
import { stat, access } from "fs/promises";
import { exec, spawn } from "child_process";
import { promisify } from "util";

/**
 * 调用钩子脚本，如果钩子不存在则返回 0  
 * 若针对当前目标存在特化钩子，则调用特化钩子  
 * 执行钩子前会将其权限设置为可执行
 * @param hook 钩子名称
 * @param args 传递给钩子的参数
 * @returns 钩子的返回值
 */
export async function invokeHook(hook: string, args: string[] = []) {
    if( !projectPath ) return 0

    let script = join(projectPath, rpaths.projectScripts, hook)
    const target = getFinalTarget()?.target

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