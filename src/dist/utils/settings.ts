import { homedir } from "os";
import { join } from "path";

export const PATH_DIST_SERVER = homedir()
export const PATH_CONTRIBUTORS = join(PATH_DIST_SERVER, 'contributors')
export const PATH_REPOSITORIES = join(PATH_DIST_SERVER, 'repositories')