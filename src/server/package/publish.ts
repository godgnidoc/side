import { RequestContext } from 'jetweb'
import { IsContributor, IsDir, IsFile, authorizationFailed, authorize, done, fail, internalFailure, invalidArgument, permissionDenied } from 'server/utils'
import { QueryPackages, busyPackages } from './common'
import { join } from 'path'
import { promisify } from 'util'
import { exec } from 'child_process'
import { mkdir, rename, rm, writeFile } from 'fs/promises'
import { createWriteStream } from 'fs'
import { CreateTask } from 'server/task'
import { LatestPackageId, PackageId, PackageManifest, getLastValidateErrorText, loadJson, validateSync } from 'format'

/**
 * 获取资源包文件，校验资源包文件的完整性并发布到正确位置
 */
async function TaskCallbackPublish(this: RequestContext, packageId: PackageId) {
    try {
        const tmpDir = packageId.path + '.publishing'
        const tmpPack = join(tmpDir, 'package.tar')

        // 清理并重新创建临时目录，用于存放上传的包文件
        await promisify(exec)('rm -rf ' + tmpDir)
        await mkdir(tmpDir, { recursive: true })

        // 等待包文件上传完成
        const file = createWriteStream(tmpPack, { autoClose: true })
        this.request.incomingMessage.pipe(file)
        this.response.writeContinue()
        await new Promise((resolve) => { this.request.incomingMessage.on('end', resolve) })

        // 解压包文件
        await promisify(exec)('tar -xf ' + tmpPack, { cwd: tmpDir })

        // 校验包结构
        if (!await IsDir(join(tmpDir, 'meta')))
            return fail(2, 'Invalid package structure: meta directory missing')
        if (!await IsDir(join(tmpDir, 'root')) && !await IsFile(join(tmpDir, 'root.tar.xz')))
            return fail(2, 'Invalid package structure: root content missing')
        if (await IsDir(join(tmpDir, 'root')) && await IsFile(join(tmpDir, 'root.tar.xz')))
            return fail(2, 'Invalid package structure: root content duplicated')

        // 校验包清单
        const manifest = await loadJson<PackageManifest>(join(tmpDir, 'meta', 'manifest'), 'PackageManifest')

        // 清理并覆盖目标包
        await rm(packageId.path, { recursive: true, force: true })
        await rename(tmpPack, packageId.path)
        await promisify(exec)('rm -rf ' + tmpDir)

        // 更新包清单
        await writeFile(packageId.manifestPath, JSON.stringify(manifest))

        return done()
    } catch (e) {
        console.error(e)
        return internalFailure()
    } finally {
        busyPackages.delete(packageId.toString())
    }
}

async function validateDependencies(arg0: PackageId | PackageManifest, dependencies: string[] = []) {
    if (arg0 instanceof PackageId) {
        const packageId = arg0
        const id = packageId.toString()
        try {
            const manifest = await loadJson<PackageManifest>(packageId.manifestPath, 'PackageManifest')
            return await validateDependencies(manifest, dependencies)
        } catch (e) {
            return `invalid ${id}: ${e}`
        }
    }

    const manifest = arg0
    const id = manifest.packageId.toString()
    if (id in dependencies) return `cycle: ${id}`

    const depends = manifest.depends
    if (!depends) return undefined

    for (const query in depends) {
        const dep = LatestPackageId(await QueryPackages(query))
        if (!dep) return `missing: ${query}`
        const err = await validateDependencies(dep, [...dependencies, id])
        if (err) return err
    }

    return undefined
}

export async function postPublish(this: RequestContext, manifest: any, allowOverwrite: boolean, allowDowngrade: boolean) {
    // 检查用户是否登录
    const user = await authorize(this)
    if (!user) return authorizationFailed()

    if (!validateSync<PackageManifest>(manifest, 'PackageManifest'))
        return invalidArgument('Invalid package manifest: ' + getLastValidateErrorText('PackageManifest'))
    const packageId = PackageId.FromString(manifest.packageId)
    if (packageId instanceof Error) return invalidArgument('Invalid packageId: ' + packageId.message)

    // 检查仓库是否存在
    if (!await IsDir(packageId.repoPath)) return fail(1, 'Repository not exists: ' + packageId.repoPath)

    // 检查用户是否有权限发布包
    if (!await IsContributor(packageId.repoPath, user.name))
        return permissionDenied('You are not a contributor of this repository: ' + packageId.repoId)

    const idObjs = await QueryPackages(packageId.query)
    const idStrs = idObjs.map(id => id.toString())

    // 检查包是否已存在，如果已存在则检查是否允许覆盖
    if (idStrs.includes(packageId.toString())) {
        if (!allowOverwrite) return fail(1, 'Package already exists: ' + packageId.toString())
    }

    // 检查包版本是否低于最新版本，如果低于则检查是否允许降级
    const latest = LatestPackageId(idObjs)
    if (latest && latest.version.compare(packageId.version) > 0) {
        if (!allowDowngrade) return fail(1, 'Package version is lower than latest version: ' + packageId.toString())
    }

    // 检查包依赖是否存在循环依赖
    const cycle = await validateDependencies(manifest)
    if (cycle) {
        return fail(1, 'Package dependencies issuse: ' + cycle)
    }

    // 检查包是否正在发布，如果正在发布则返回错误
    if (busyPackages.has(packageId.toString())) return fail(6, 'Package is busy: ' + packageId.toString())
    busyPackages.add(packageId.toString())

    // 创建任务，用于发布包
    const token = CreateTask(TaskCallbackPublish, [packageId], () => {
        busyPackages.delete(packageId.toString())
    })

    return done(token)
}