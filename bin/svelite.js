#!/usr/bin/env node

import path from 'path'
import { createApp } from "../src/index.js"
import { mkdir, rm, copyFile, cp, writeFile } from 'fs/promises'
import { exec } from 'child_process'

if (process.argv.includes('build')) {
    if (process.argv.includes('vercel')) {
        await rm('.vercel/output', { force: true, recursive: true })
        await mkdir('.vercel/output', { recursive: true })

        await mkdir('.vercel/output/functions/fn.func', { recursive: true });

        // Copy files and directories
        await cp('public', '.vercel/output/static', { recursive: true });
        await cp('components', '.vercel/output/functions/fn.func/components', { recursive: true });
        await copyFile('package.json', '.vercel/output/functions/fn.func/package.json');
        await copyFile('package-lock.json', '.vercel/output/functions/fn.func/package-lock.json');
        await copyFile('app.config.js', '.vercel/output/functions/fn.func/app.config.js');
        await cp('node_modules', '.vercel/output/functions/fn.func/node_modules', { recursive: true });

        // Write config.json
        await writeFile('.vercel/output/config.json', JSON.stringify({
            "version": 3,
            "routes": [
                { "handle": "filesystem" },
                { "src": "/.*", "dest": "/fn" }
            ]
        }, null, 4));

        // Write index.js for function
        await writeFile('.vercel/output/functions/fn.func/index.js', `import config from './app.config.js';\nimport {createApp} from 'svelite-html';\n\nexport default createApp(config);`);

        // Write .vc-config.json
        await writeFile('.vercel/output/functions/fn.func/.vc-config.json', JSON.stringify({
            "runtime": "nodejs20.x",
            "handler": "index.js",
            "launcherType": "Nodejs"
        }, null, 4));


    }
} else if (process.argv.includes('deploy')) {
    // Run vercel deploy command
    exec('npx vercel deploy --prebuilt --prod', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

} else {
    createApp(
        path.resolve('./app.config.js')
    ).start(3000)
}
