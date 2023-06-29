import { Feature } from '@godgnidoc/decli'
import { dirname, join } from 'path'
import * as semver from 'semver'
import { copyFile, mkdir, rm, writeFile } from 'fs/promises'
import { promisify } from 'util'
import { exec } from 'child_process'
import { PackageId, PackageManifest, PackingManifest, loadYamlSync } from 'format'
import { PROJECT } from 'project'
import { SidePlatform } from 'platform'
import { Find } from 'filesystem'

class DistPackFeature extends Feature {
    args = '<version> [manifest]'
    brief = 'Pack current project to a package'
    description = 'Pack current project to a package\n'
        + '  version: version of the package\n'
        + '  manifest: path to the manifest file, default to final target of the project'

    workspace = process.cwd()
    release: string = PROJECT.DEFAULT_DIRS.RELEASE
    dist: string = PROJECT.DEFAULT_DIRS.DIST
    packing: string = PROJECT.DEFAULT_DIRS.PACKAGE
    doc: string = PROJECT.DEFAULT_DIRS.DOCUMENT

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

        const packing = args[1]
            ? loadYamlSync<PackingManifest>(args[1], 'PackingManifest')
            : loadYamlSync<PackingManifest>(PROJECT.RPATH.TARGET, 'PackingManifest')

        if (typeof packing.dirs?.RELEASE === 'string') this.release = packing.dirs.RELEASE
        if (typeof packing.dirs?.DIST === 'string') this.dist = packing.dirs.DIST
        if (typeof packing.dirs?.PACKAGE === 'string') this.packing = packing.dirs.PACKAGE
        if (typeof packing.dirs?.DOCUMENT === 'string') this.doc = packing.dirs.DOCUMENT

        await this.prepareWorkspace()
        const manifest = this.makeManifest(packing.packing, version)
        if (manifest instanceof Error) {
            console.error('Failed to make package manifest: %s', manifest.message)
            return 1
        }
        await writeFile(join(this.workspace, this.packing, 'meta', 'manifest'), JSON.stringify(manifest))

        /**@TODO collect doc content */
        // await this.collectDocContent(workspace, packing, manifest)

        await this.collectRootContent(packing.packing)
        await this.collectHookContent(packing.packing)
        await this.releasePackage(manifest)
        await this.cleanWorkspace()
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
        await rm(join(this.workspace, this.packing), { recursive: true, force: true })
        await mkdir(join(this.workspace, this.packing, 'meta'), { recursive: true })
        await mkdir(join(this.workspace, this.packing, 'hook'), { recursive: true })
        await mkdir(join(this.workspace, this.packing, 'root'), { recursive: true })
    }

    async collectRootContent(packing: PackingManifest['packing']) {
        const root = join(this.workspace, this.dist)

        // 定位源路径下所有的文件
        const files = await Find(root, { ...packing.root, collapse: true })

        if (packing.root?.compress === true) {
            console.verbose('pack: compressing files:\n%s', files.map(f => '  ' + f).join('\n'))
            await promisify(exec)(`tar -Jcf ${join(this.workspace, this.packing, 'root.tar.xz')} ${files.join(' ')}`, { cwd: root })
            await rm(join(this.workspace, this.packing, 'root'), { recursive: true, force: true })
        } else {
            const all = files.map(async file => {
                console.verbose('pack: copying %s', file)
                await mkdir(join(this.workspace, this.packing, 'root', dirname(file)), { recursive: true })
                return promisify(exec)(`cp -r --no-dereference ${file} ${join(this.workspace, this.packing, 'root', file)}`, { cwd: root })
            })
            await Promise.all(all)
        }
    }

    async collectHookContent(packing: PackingManifest['packing']) {

        if (packing.hooks?.install)
            await copyFile(join(this.workspace, packing.hooks.install), join(this.workspace, this.packing, 'hook', 'install'))

        if (packing.hooks?.uninstall)
            await copyFile(join(this.workspace, packing.hooks.uninstall), join(this.workspace, this.packing, 'hook', 'uninstall'))

        if (packing.hooks?.activate)
            await copyFile(join(this.workspace, packing.hooks.activate), join(this.workspace, this.packing, 'hook', 'activate'))

        if (packing.hooks?.deactivate)
            await copyFile(join(this.workspace, packing.hooks.deactivate), join(this.workspace, this.packing, 'hook', 'deactivate'))

        if (packing.hooks?.test)
            await copyFile(join(this.workspace, packing.hooks.test), join(this.workspace, this.packing, 'hook', 'test'))
    }

    async releasePackage(manifest: PackageManifest) {
        const packageId = PackageId.FromString(manifest.packageId)
        if (packageId instanceof Error) throw packageId
        const path = join(this.workspace, this.release, `${packageId.fileName}`)

        await mkdir(join(this.workspace, this.release), { recursive: true })
        await promisify(exec)(`tar -cf ${path} *`, { cwd: join(this.workspace, this.packing) })
    }

    async cleanWorkspace() {
        await rm(join(this.workspace, this.packing), { recursive: true, force: true })
    }
}

export const distPackFeature = new DistPackFeature()