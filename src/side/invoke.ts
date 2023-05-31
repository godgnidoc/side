import { join } from 'path'
import { readdir } from 'fs/promises'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { Feature } from '@godgnidoc/decli'
import { PROJECT, Project } from 'project'
import { inflate } from 'inflate'
import { IsExist } from 'filesystem'

export const invokeHookFeature = new class extends Feature {
    args = '<hook> [args...]'
    brief = 'Invoke hook scripts'
    description = 'Invoke the specified hook script with given arguments'

    complete = async (editing: boolean, args: string[]) => {
        if (args.length > 1) return []
        try {
            const hooks = await readdir(join(Project.This().path, PROJECT.RPATH.SCRIPTS))
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
        const script = join(Project.This().path, PROJECT.RPATH.SCRIPTS, name)

        if (!await IsExist(script)) {
            return console.error('hook script %s not found', script), 1
        }

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
}