import { distLoginFeature } from './user/login'
import { userCreateFeature } from './user/create'
import { userMeFeature } from './user/me'
import { distPackFeature } from './package/pack'
import { scopeCreateFeature } from './scope/create'
import { repoCreateFeature } from './repo/create'
import { distPublishFeature } from './package/publish'
import { distSearchFeature } from './package/search'
import { distReposFeature } from './repo/repos'
import { distScopesFeature } from './scope/scopes'
import { distQueryFeature } from './package/query'
import { distGetFeature } from './package/get'
import { distRmFeature } from './package/rm'
import { distInstallFeature } from './package/install'
import { scopeGrantFeature } from './scope/grant'
import { repoGrantFeature } from './repo/grant'
import { distGrabFeature } from './package/grab'
import { distDeployFeature } from './package/deploy'
import { repoWhichFeature } from './repo/which'

export const distModule = {
    login: distLoginFeature,
    me: userMeFeature,

    create: {
        user: userCreateFeature,
        scope: scopeCreateFeature,
        repo: repoCreateFeature
    },

    grant: {
        scope: scopeGrantFeature,
        repo: repoGrantFeature
    },
    pack: distPackFeature,
    publish: distPublishFeature,

    query: distQueryFeature,
    ls: distSearchFeature,
    packages: distSearchFeature,
    repos: distReposFeature,
    scopes: distScopesFeature,

    get: distGetFeature,
    install: distInstallFeature,
    rm: distRmFeature,

    deploy: distDeployFeature,
    grab: distGrabFeature,

    which: repoWhichFeature
}