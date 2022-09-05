import * as path from 'path'
import { readFile, writeFile } from 'fs/promises'
import * as yaml from 'js-yaml'
import makeDedicatedLockfile from '@pnpm/make-dedicated-lockfile'
import { SubrepoScriptConfig } from '../foreach'

const workspaceFilename = 'pnpm-workspace.yaml'

export function generateSubdirLock(config: SubrepoScriptConfig<{}>): Promise<void> {
  return cjsInterop(makeDedicatedLockfile)(
    config.rootDir,
    config.subrepoDir,
  )
}

export async function generateSubdirWorkspace(config: SubrepoScriptConfig<{}>): Promise<void> {
  const srcPath = path.join(config.rootDir, workspaceFilename)
  const destPath = path.join(config.subrepoDir, workspaceFilename)

  const yamlStr = await readFile(srcPath, { encoding: 'utf8' })
  const yamlDoc = yaml.load(yamlStr) as { packages: string[] }
  const scopedPackages = scopePackages(yamlDoc.packages, config.subrepo)

  if (scopedPackages.length) {
    yamlDoc.packages = scopedPackages
    const newYamlStr = yaml.dump(yamlDoc)
    return writeFile(destPath, newYamlStr)
  } else {
    return Promise.resolve()
  }
}

function scopePackages(packageGlobs: string[], subrepo: string): string[] {
  const newPackageGlobs: string[] = []
  const prefix = `./${subrepo}/`

  for (const packageGlob of packageGlobs) {
    if (packageGlob.indexOf(prefix) === 0) {
      newPackageGlobs.push('./' + packageGlob.substring(prefix.length))
    }
  }

  return newPackageGlobs
}

// TODO: tsx handles __esModule strangely (esModuleInterop). bug maintainer
// https://github.com/esbuild-kit/tsx/issues/67
function cjsInterop<Type>(input: Type): Type {
  return (input as any).default || input
}
