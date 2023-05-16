import { Feature } from '@godgnidoc/decli'
import { dirname, join } from 'path'
import * as semver from 'semver'
import { copyFile, mkdir, rm, writeFile } from 'fs/promises'
import { promisify } from 'util'
import { exec } from 'child_process'
import { PackageManifest, PackingManifest } from 'format'
import { loadPackingManifest, selectPackingManifest, selectReleasePath } from './common'
import { Project } from 'project'

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

        const packing = await loadPackingManifest(selectPackingManifest(args[1]))

        const manifest = PackageManifest.Make(packing, version)
        if (manifest instanceof Error) {
            console.error('Failed to make package manifest: %s', manifest.message)
            return 1
        }
        await writeFile(join(workspace, 'meta', 'manifest'), JSON.stringify(manifest.toJson()))

        /**@TODO collect doc content */
        // await this.collectDocContent(workspace, packing, manifest)

        await this.collectRootContent(workspace, packing)
        await this.collectHookContent(workspace, packing)
        await this.releasePackage(workspace, manifest)
        await this.cleanWorkspace(workspace)
        return 0
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

        const files: string[] = []
        if (packing.root?.includes) {
            for (const include of packing.root.includes) {
                const cmd = await promisify(exec)(`find . -not -type d -path ${include}`, { cwd: root })
                files.push(...cmd.stdout.trim().split('\n'))
            }
        } else if (packing.root?.excludes) {
            const c = 'find . -not -type d -not -path ' + packing.root.excludes.map(e => `-path ${e}`).join(' -not -path ')

            const cmd = await promisify(exec)(c, { cwd: root })
            files.push(...cmd.stdout.trim().split('\n'))
        } else {
            const cmd = await promisify(exec)('find . -not -type d', { cwd: root })
            files.push(...cmd.stdout.trim().split('\n'))
        }

        if (packing.root?.compress === true) {
            await promisify(exec)(`tar -Jcf ${join(workspace, 'root.tar.xz')} ${files.join(' ')}`, { cwd: root })
            await rm(join(workspace, 'root'), { recursive: true, force: true })
        } else {
            const all = files.map(async file => {
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
        const path = join(release, `${manifest.packageId.fname}`)

        await mkdir(release, { recursive: true })
        await promisify(exec)(`tar -cf ${path} *`, { cwd: workspace })
    }

    async cleanWorkspace(workspace: string) {
        await rm(workspace, { recursive: true, force: true })
    }
}