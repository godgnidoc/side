import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname } from "path"

export async function readAllInput() {
    let input = ''
    process.stdin.on('data', (chunk) => {
        input += chunk.toString()
    })
    return new Promise<string>((resolve) => {
        process.stdin.on('end', () => {
            resolve(input)
        })
    })
}

export async function inputFrom(file = '-') {
    if (file == '-') return await readAllInput()
    try {
        return await readFile(file, 'utf-8')
    } catch (e) {
        console.error('failed to read file %s: %s', file, e.message)
        return undefined
    }
}

export async function outputTo(content: string, file = '-') {
    if (file == '-') {
        console.log(content)
    } else {
        await mkdir(dirname(file), { recursive: true })
        await writeFile(file, content)
    }
}