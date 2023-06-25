import { Feature } from '@godgnidoc/decli'
import { exec, spawn } from 'child_process'
import { readdir } from 'fs/promises'
import inquirer from 'inquirer'
import { dirname, join } from 'path'
import { promisify } from 'util'

export const docFeature = new class extends Feature {
    args = '[doc]'
    brief = 'Display specified document'
    description = 'Display specified document'
    async entry(doc?: string) {
        const dir = join(dirname(new URL(import.meta.url).pathname), 'doc')
        const docs = await readdir(dir, 'utf-8')

        if (!doc) {
            const answer = await inquirer.prompt([{
                type: 'list',
                name: 'doc',
                message: 'Select document',
                choices: docs
            }])
            doc = answer.doc
        }

        const candidates = [
            { bin: 'code', cmd: `code ${dir}/${doc}` },
            { bin: 'gedit', cmd: `gedit ${dir}/${doc}` },
            { bin: 'vim', cmd: `vim ${dir}/${doc}` },
            { bin: 'more', cmd: `more ${dir}/${doc}` },
            { bin: 'cat', cmd: `cat ${dir}/${doc}` }
        ]

        for (const candidate of candidates) {
            try {
                await promisify(exec)(`which ${candidate.bin}`)
                const cp = spawn(candidate.cmd, { shell: '/bin/bash', stdio: 'inherit' })
                return new Promise<number>((resolve) => cp.on('exit', (code) => resolve(code)))
            } catch {
                continue
            }
        }

        console.error('No editor found')
        return 1
    }
}