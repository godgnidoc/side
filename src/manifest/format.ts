import * as yaml from 'js-yaml';

export function parse(content: string, format: 'unknown' | 'yaml' | 'json' = 'unknown') {
    switch (format) {
        case 'unknown': {
            try {
                
            } catch {
                try {
                    return yaml.load(content);
                } catch {
                    throw new Error('Unrecognized format');
                }
            }
        }
        case 'yaml':
            return yaml.load(content);
        case 'json':
            return JSON.parse(content);
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}

export function format(manifest: any, format: 'yaml' | 'json' = 'yaml') {
    switch (format) {
        case 'yaml':
            return yaml.dump(manifest);
        case 'json':
            return JSON.stringify(manifest);
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}

export async function load(_path: string) {

}