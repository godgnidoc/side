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