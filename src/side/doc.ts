import { Feature } from '@godgnidoc/decli'
import { spawn } from 'child_process'
import { readdir } from 'fs/promises'
import inquirer from 'inquirer'
import { dirname, join } from 'path'

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

        const cp = spawn(`more ${dir}/${doc}`, { shell: '/bin/bash', stdio: 'inherit' })
        return new Promise<number>((resolve) => cp.on('exit', (code) => resolve(code)))
    }
}