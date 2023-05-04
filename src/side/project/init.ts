import { Brief, Feature, LongOpt } from '@godgnidoc/decli'
import { basename, join, relative } from 'path'
import { access, mkdir, readFile, rmdir, writeFile } from 'fs/promises'
import { defaultDirs, rpaths, sideVersion } from 'environment'
import { exec } from 'child_process'
import { promisify } from 'util'
import { ProjectManifest } from 'format'
import { dump } from 'js-yaml'

class ProjectInitFeature extends Feature {
    args = '[target-path]'
    brief = 'Initialize a new project'
    description = 'Create new project directory and initialize it with default files'

    @LongOpt('--force')
    @Brief('Overwrite existing project')
    force = false

    async entry(...args: string[]): Promise<number> {
        if (args.length > 1) {
            console.error('Too many arguments, only one target directory is allowed')
            return 1
        }
        const target = args[0] || process.cwd()
        const result = await this.incaseExisting(target)
        if (result) return result

        console.info('Initializing project in %s', target)
        await this.buildFolderStructure(target)
        await this.initiateManifest(target)
        await this.initiateGitStuff(target)

        return 0
    }

    async incaseExisting(target: string) {
        try {
            await access(join(target, rpaths.projectManifest))
            if (!this.force) {
                console.error('Target directory is an existing project, add --force to overwrite it')
                return 1
            }

            console.warn('Target directory is an existing project, overwriting it')
            await rmdir(join(target, rpaths.projectMeta), { recursive: true })
        } catch {
            // pass
        }
    }

    async buildFolderStructure(target: string) {
        await mkdir(join(target, rpaths.projectTargets), { recursive: true })
        await mkdir(join(target, rpaths.projectScripts), { recursive: true })
        await mkdir(join(target, rpaths.projectResources), { recursive: true })
        await mkdir(join(target, rpaths.projectSysroot), { recursive: true })
    }

    async initiateGitStuff(target: string) {
        try {
            const result = await promisify(exec)('git init', { cwd: target })
            if (result.stderr) console.error(result.stderr.trim())
            if (result.stdout) console.info(result.stdout.trim())
        } catch (e) {
            // pass
        }

        // 创建项目元空间的 .gitignore 文件
        await writeFile(join(target, rpaths.projectMeta, '.gitignore'), `# ignore files\n\n`
            + `/*\n`
            + `!/${relative(rpaths.projectMeta, rpaths.projectResources)}/\n`
            + `!/${relative(rpaths.projectMeta, rpaths.projectScripts)}/\n`
            + `!/${relative(rpaths.projectMeta, rpaths.projectTargets)}/\n`
            + `!/${relative(rpaths.projectMeta, rpaths.projectManifest)}\n`
            + `!/.gitignore\n`
        )

        const path = join(target, rpaths.projectMeta, '.gitignore')
        try {
            // 若已存在 .gitignore 文件，则在文件末尾添加内容
            let ignore = await readFile(path, 'utf-8')
            ignore += '\n\n# ignore files\n\n'
                + `/${relative(target, defaultDirs.build)}/\n`
                + `/${relative(target, defaultDirs.release)}/\n`
                + `/${relative(target, defaultDirs.module)}/\n`
            await writeFile(path, ignore)
        } catch {
            // 若不存在 .gitignore 文件，则创建文件
            await writeFile(join(target, '.gitignore'), `# ignore files\n\n`
                + `/${relative(target, defaultDirs.build)}/\n`
                + `/${relative(target, defaultDirs.release)}/\n`
                + `/${relative(target, defaultDirs.module)}/\n`
            )
        }
    }

    async initiateManifest(target: string) {
        const manifest: ProjectManifest = {
            $structure: 'side.manifest',
            project: basename(target),
            engine: sideVersion
        }
        await writeFile(join(target, rpaths.projectManifest), dump(manifest))
    }
}

export const projectInitFeature = new ProjectInitFeature