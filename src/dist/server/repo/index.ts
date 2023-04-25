import * as Create from "./create"
import * as Grant from "./grant"
import * as Revoke from "./revoke"
import * as Search from "./search"

export default { ...Create, ...Grant, ...Revoke, ...Search }