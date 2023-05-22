import { Feature } from '@godgnidoc/decli'
import { dirname, join } from 'path'
import * as semver from 'semver'
import { copyFile, mkdir, rm, writeFile } from 'fs/promises'
import { promisify } from 'util'
import { exec } from 'child_process'
import { PackageId, PackageManifest, PackingManifest, loadYamlSync } from 'format'
import { selectPackingManifest, selectReleasePath } from 'disting'
import { Project } from 'project'
import { SidePlatform } from 'platform'
import { Find } from 'filesystem'

export const distPackFeature = new class extends Feature {
    args = '<version> [manifest]'
    brief = 'Pack current project to a package'
    description = 'Pack current project to a package\n'
        + '  version: version of the package\n'
        + '  manifest: path to the manifest file, default to final target of the project'

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

        const packing = loadYamlSync<PackingManifest>(selectPackingManifest(args[1]), 'PackingManifest')

        const manifest = this.makeManifest(packing.packing, version)
        if (manifest instanceof Error) {
            console.error('Failed to make package manifest: %s', manifest.message)
            return 1
        }
        await writeFile(join(workspace, 'meta', 'manifest'), JSON.stringify(manifest))

        /**@TODO collect doc content */
        // await this.collectDocContent(workspace, packing, manifest)

        await this.collectRootContent(workspace, packing.packing)
        await this.collectHookContent(workspace, packing.packing)
        await this.releasePackage(workspace, manifest)
        await this.cleanWorkspace(workspace)
        return 0
    }

    makeManifest(packing: PackingManifest['packing'], version: string): PackageManifest | Error {
        if (!semver.valid(version)) return new Error('invalid version format')
        const packageId = PackageId.FromRepoId(packing.repo, version, packing.tags)
        if (packageId instanceof Error) return packageId

        const user = SidePlatform.settings.dist.user
        if (!user) return new Error('please login first')

        const manifest: PackageManifest = {
            packageId: packageId.toString(),
            engine: SidePlatform.version,
            createUser: user,
            createTime: new Date().toLocaleString(),
            depends: {},
            deploy: {},
        }

        if (packing.depends) {
            for (const query in packing.depends) {
                const ver = semver.valid(packing.depends[query])
                if (!ver) return new Error('invalid version format: ' + query + ' : ' + packing.depends[query])
                manifest.depends[query] = ver
            }
        }

        manifest.deploy.strategy = 'none'
        if (packing.deploy) {
            manifest.deploy.strategy = packing.deploy.strategy
            if (packing.deploy.excludes) manifest.deploy.excludes = packing.deploy.excludes
            if (packing.deploy.includes) manifest.deploy.includes = packing.deploy.includes
        }

        return manifest
    }

    async prepareWorkspace() {
        const workspace = join(Project.This().path, Project.This().manifest.dirs.PACKAGE)

        await rm(workspace, { recursive: true, force: true })
        await mkdir(join(workspace, 'meta'), { recursive: true })
        await mkdir(join(workspace, 'hook'), { recursive: true })
        await mkdir(join(workspace, 'root'), { recursive: true })
        return workspace
    }

    async collectRootContent(workspace: string, packing: PackingManifest['packing']) {
        const root = join(Project.This().path, Project.This().manifest.dirs.BUILD)

        // 定位源路径下所有的文件
        const files = await Find(root, packing.root)

        if (packing.root?.compress === true) {
            console.verbose('pack: compressing files:\n%s', files.map(f => '  ' + f).join('\n'))
            await promisify(exec)(`tar -Jcf ${join(workspace, 'root.tar.xz')} ${files.join(' ')}`, { cwd: root })
            await rm(join(workspace, 'root'), { recursive: true, force: true })
        } else {
            const all = files.map(async file => {
                console.verbose('pack: copying %s', file)
                await mkdir(join(workspace, 'root', dirname(file)), { recursive: true })
                return promisify(exec)(`cp --no-dereference ${file} ${join(workspace, 'root', file)}`, { cwd: root })
            })
            await Promise.all(all)
        }
    }

    async collectHookContent(workspace: string, packing: PackingManifest['packing']) {

        if (packing.hooks?.install)
            await copyFile(join(Project.This().path, packing.hooks.install), join(workspace, 'hook', 'install'))

        if (packing.hooks?.uninstall)
            await copyFile(join(Project.This().path, packing.hooks.uninstall), join(workspace, 'hook', 'uninstall'))

        if (packing.hooks?.activate)
            await copyFile(join(Project.This().path, packing.hooks.activate), join(workspace, 'hook', 'activate'))

        if (packing.hooks?.deactivate)
            await copyFile(join(Project.This().path, packing.hooks.deactivate), join(workspace, 'hook', 'deactivate'))

        if (packing.hooks?.test)
            await copyFile(join(Project.This().path, packing.hooks.test), join(workspace, 'hook', 'test'))
    }

    async releasePackage(workspace: string, manifest: PackageManifest) {
        const release = selectReleasePath()
        const packageId = PackageId.FromString(manifest.packageId)
        if (packageId instanceof Error) throw packageId
        const path = join(release, `${packageId.fileName}`)

        await mkdir(release, { recursive: true })
        await promisify(exec)(`tar -cf ${path} *`, { cwd: workspace })
    }

    async cleanWorkspace(workspace: string) {
        await rm(workspace, { recursive: true, force: true })
    }
}