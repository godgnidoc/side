import { distLoginFeature } from './client/user/login'
import { userCreateFeature } from './client/user/create'
import { userMeFeature } from './client/user/me'
import { distServeFeature } from './server'
import { distPackFeature } from './client/package/pack'

export const dist = {
    serve: distServeFeature,
    login: distLoginFeature,
    me: userMeFeature,
    create: {
        user: userCreateFeature,
    },
    pack: distPackFeature,
}