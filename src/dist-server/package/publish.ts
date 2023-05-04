import { RequestContext } from "jetweb"
import { IsContributor, IsDir, IsFile, authorization_failed, authorize, done, fail, internal_failure, invalid_argument, permission_denied } from "../utils"
import { QueryPackages, busy_packages } from "./common"
import { join } from "path"
import { promisify } from "util"
import { exec } from "child_process"
import { mkdir, readFile, rename, rm } from "fs/promises"
import { createWriteStream } from "fs"
import { CreateTask } from "../task"
import { LatestPackageId, PackageId, PackageManifest } from "format"

/**
 * 获取资源包文件，校验资源包文件的完整性并发布到正确位置
 */
async function TaskCallbackPublish(this: RequestContext, packageId: PackageId) {
    try {
        const tmp_dir = packageId.path + '-publishing'
        const tmp_pack = join(tmp_dir, 'package.tar')
        const pack = packageId.path + '.tar'

        // 清理并重新创建临时目录，用于存放上传的包文件
        await promisify(exec)('rm -rf ' + tmp_dir)
        await mkdir(tmp_dir, { recursive: true })

        // 等待包文件上传完成
        const file = createWriteStream(tmp_pack, { autoClose: true })
        this.request.incomingMessage.pipe(file)
        this.response.writeContinue()
        await new Promise((resolve, _reject) => { this.request.incomingMessage.on('end', resolve) })

        // 解压包文件
        await promisify(exec)('tar -xf ' + tmp_pack, { cwd: tmp_dir })

        // 校验包结构
        if (!await IsDir(join(tmp_dir, 'meta')))
            return fail(2, 'Invalid package structure: meta directory missing')
        if (!await IsDir(join(tmp_dir, 'root')) && !await IsFile(join(tmp_dir, 'root.tar.xz')))
            return fail(2, 'Invalid package structure: root content missing')
        if (await IsDir(join(tmp_dir, 'root')) && await IsFile(join(tmp_dir, 'root.tar.xz')))
            return fail(2, 'Invalid package structure: root content duplicated')

        // 校验包清单
        const raw_manifest = await readFile(join(tmp_dir, 'meta', 'manifest'), 'utf-8')
        const manifest = PackageManifest.Parse(JSON.parse(raw_manifest.toString()))
        if (manifest instanceof Error) return fail(2, 'Invalid package manifest: ' + manifest.message)

        // 清理并覆盖目标包
        await rm(pack, { recursive: true, force: true })
        await rename(tmp_pack, pack)

        return done()
    } catch (e) {
        console.error(e)
        return internal_failure()
    } finally {
        busy_packages.delete(packageId.toString())
    }
}

async function PublishPackageById(this: RequestContext, id: string, allowOverwrite: boolean, allowDowngrade: boolean) {
    // 检查用户是否登录
    const user = await authorize(this)
    if (!user) authorization_failed()

    // 检查包ID是否合法
    const packageId = PackageId.Parse(id)
    if (packageId instanceof Error) return invalid_argument('Invalid package id: ' + packageId.message)

    // 检查仓库是否存在
    if (!await IsDir(packageId.repo_path)) return fail(1, 'Repository not exists: ' + packageId.repo_path)

    // 检查用户是否有权限发布包
    if (!IsContributor(user.name, packageId.repo_path))
        return permission_denied('You are not a contributor of this repository: ' + packageId.repo_id)

    const id_objs = await QueryPackages(packageId.query)
    const id_strs = id_objs.map(id => id.toString())

    // 检查包是否已存在，如果已存在则检查是否允许覆盖
    if (id_strs.includes(packageId.toString())) {
        if (!allowOverwrite) return fail(1, 'Package already exists: ' + id)
    }

    // 检查包版本是否低于最新版本，如果低于则检查是否允许降级
    const latest = LatestPackageId(id_objs)
    if (latest.version.compare(packageId.version) > 0) {
        if (!allowDowngrade) return fail(1, 'Package version is lower than latest version: ' + id)
    }

    // 检查包是否正在发布，如果正在发布则返回错误
    if (busy_packages.has(packageId.toString())) return fail(6, 'Package is busy: ' + id)
    busy_packages.add(packageId.toString())

    // 创建任务，用于发布包
    CreateTask(TaskCallbackPublish.bind(undefined, packageId), () => {
        busy_packages.delete(packageId.toString())
    })
}

export const Publish = {
    async postByName(scope: string, name: string, tags: string[], allowOverwrite: boolean, allowDowngrade: boolean) {
        const packageId = PackageId.Parse(name)
        if (packageId instanceof Error) return invalid_argument('Invalid package name: ' + packageId.message)
        if (!packageId.setScope(scope)) return invalid_argument('Invalid package scope: ' + scope)
        if (!packageId.setTags(tags)) return invalid_argument('Invalid package tags: ' + tags.join(','))
        return await PublishPackageById.call(this, packageId.toString(), allowOverwrite, allowDowngrade)
    },
    async postById(id: string, allowOverwrite: boolean, allowDowngrade: boolean) {
        return await PublishPackageById.call(this, id, allowOverwrite, allowDowngrade)
    }
}