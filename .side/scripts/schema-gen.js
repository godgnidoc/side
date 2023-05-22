import { writeFileSync } from "fs"
import { resolve } from "path";
import parse from 'json-schema-to-markdown'

import * as TJS from "typescript-json-schema";

// optionally pass argument to schema generator
const settings = {
    required: true,
    excludePrivate: true,
};

const program = TJS.programFromConfig(resolve("tsconfig.json"));

// ... or a generator that lets us incrementally get more schemas
const generator = TJS.buildGenerator(program, settings);

// generator can be also reused to speed up generating the schema if usecase allows:
process.argv.shift(); // remove node
process.argv.shift(); // remove path to script

for(const type of process.argv) {
    const schema = generator?.getSchemaForSymbol(type)
    writeFileSync(resolve(`build/schema/${type}.json`), JSON.stringify(schema, null, 2))
    writeFileSync(resolve(`build/doc/${type}.md`), parse(schema));
}