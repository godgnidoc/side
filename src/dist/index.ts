import { distLoginFeature } from './client/login'
import { userCreateFeature } from './client/user/create'
import { userMeFeature } from './client/user/me'
import { distServeFeature } from './server'

export const dist = {
    serve: distServeFeature,
    login: distLoginFeature,
    me: userMeFeature,
    create: {
        user: userCreateFeature
    }
}