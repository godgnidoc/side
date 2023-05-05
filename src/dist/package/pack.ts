import { Feature } from "@godgnidoc/decli"
import { dirname, join } from "path"
import * as semver from 'semver'
import { defaultDirs, projectManifest, projectPath } from "environment"
import { copyFile, mkdir, rm, writeFile } from "fs/promises"
import { promisify } from "util"
import { exec } from "child_process"
import { PackageManifest, PackingManifest } from "format"
import { loadPackingManifest, selectPackingManifest, selectReleasePath } from "./common"

export const distPackFeature = new class extends Feature {
    args = '<version> [manifest]'
    brief = 'Pack current project to a package'
    description = 'Pack current project to a package\n'
        + '  version: version of the package\n'
        + '  manifest: path to the manifest file, default to final target of the project'

    /**
     * 成功打包的最终文件路径
     * 每次成功打包后，都会将打包结果复制到这个路径
     */
    package: string

    /**
     * 成功打包的包ID
     * 每次成功打包后，都会将打包结果复制到这个路径
     */
    packageid: string

    async entry(...args: string[]): Promise<number> {
        if (args.length < 1) {
            console.error('Version required')
            return 1
        }
        const version = semver.valid(args[0])
        if (!version) {
            console.error('Invalid version')
            return 1
        }

        const workspace = await this.prepareWorkspace()

        const packing = await loadPackingManifest(selectPackingManifest(args[1]))

        const manifest = await this.writePackageManifest(workspace, packing, version)

        /**@TODO collect doc content */
        // await this.collectDocContent(workspace, packing, manifest)

        await this.collectRootContent(workspace, packing, manifest)
        await this.collectHookContent(workspace, packing, manifest)
        await this.releasePackage(workspace, manifest)
        await this.cleanWorkspace(workspace)
        return 0
    }

    async prepareWorkspace() {
        const workspace = projectManifest
            ? join(projectPath, projectManifest.dirs.package)
            : join(projectPath, defaultDirs.package)

        await rm(workspace, { recursive: true, force: true })
        return workspace
    }

    async writePackageManifest(workspace: string, packing: PackingManifest['packing'], version: string) {
        const manifest = PackageManifest.Make(packing, version)
        if (manifest instanceof Error) throw manifest
        const symbol = manifest.packageId.symbol
        await mkdir(join(workspace, symbol, 'meta'), { recursive: true })
        await mkdir(join(workspace, symbol, 'hook'), { recursive: true })
        await mkdir(join(workspace, symbol, 'root'), { recursive: true })
        await writeFile(join(workspace, symbol, 'meta', 'manifest'), JSON.stringify(manifest.toJson()))
        return manifest
    }

    async collectRootContent(workspace: string, packing: PackingManifest['packing'], manifest: PackageManifest) {
        const symbol = manifest.packageId.symbol
        const root = projectManifest
            ? join(projectPath, projectManifest.dirs.build)
            : join(projectPath, defaultDirs.build)

        const files: string[] = []
        if (packing.root?.includes) {
            for (const include of packing.root.includes) {
                const cmd = await promisify(exec)(`find . -not -type d -path ${include}`, { cwd: root })
                files.push(...cmd.stdout.trim().split('\n'))
            }
        } else if (packing.root?.excludes) {
            const c = `find . -not -type d -not -path ` + packing.root.excludes.map(e => `-path ${e}`).join(' -not -path ')

            const cmd = await promisify(exec)(c, { cwd: root })
            files.push(...cmd.stdout.trim().split('\n'))
        } else {
            const cmd = await promisify(exec)(`find . -not -type d`, { cwd: root })
            files.push(...cmd.stdout.trim().split('\n'))
        }

        if (packing.root?.compress === true) {
            await rm(join(workspace, symbol, 'root'), { recursive: true, force: true })
            await promisify(exec)(`tar -Jcf ${join(workspace, symbol, 'root.tar.xz')} ${files.join(' ')}`, { cwd: root })
        } else {
            const all = files.map(async file => {
                await mkdir(join(workspace, symbol, 'root', dirname(file)), { recursive: true })
                return promisify(exec)(`cp --no-dereference ${file} ${join(workspace, symbol, 'root', file)}`, { cwd: root })
            })
            await Promise.all(all)
        }
    }

    async collectHookContent(workspace: string, packing: PackingManifest['packing'], manifest: PackageManifest) {
        const symbol = manifest.packageId.symbol

        if (packing.hooks?.install)
            await copyFile(join(projectPath, packing.hooks.install), join(workspace, symbol, 'hook', 'install'))

        if (packing.hooks?.uninstall)
            await copyFile(join(projectPath, packing.hooks.uninstall), join(workspace, symbol, 'hook', 'uninstall'))

        if (packing.hooks?.activate)
            await copyFile(join(projectPath, packing.hooks.activate), join(workspace, symbol, 'hook', 'activate'))

        if (packing.hooks?.deactivate)
            await copyFile(join(projectPath, packing.hooks.deactivate), join(workspace, symbol, 'hook', 'deactivate'))

        if (packing.hooks?.test)
            await copyFile(join(projectPath, packing.hooks.test), join(workspace, symbol, 'hook', 'test'))
    }

    async releasePackage(workspace: string, manifest: PackageManifest) {
        const symbol = manifest.packageId.symbol
        const release = selectReleasePath()
        this.package = join(release, `${manifest.packageId.fname}`)
        this.packageid = manifest.packageId.toString()
        
        await mkdir(release, { recursive: true })
        await promisify(exec)(`tar -cf ${this.package} ${symbol}`, { cwd: workspace })
    }

    async cleanWorkspace(workspace: string) {
        await rm(workspace, { recursive: true, force: true })
    }
}