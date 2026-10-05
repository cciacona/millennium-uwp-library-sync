import { cp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export async function packagePlugin(root = repositoryRoot) {
    const manifest = JSON.parse(await readFile(path.join(root, 'plugin.json'), 'utf8'));
    if (!/^[A-Za-z0-9_-]+$/.test(manifest.name)) {
        throw new Error('plugin.json must contain a valid plugin directory name');
    }

    const bundle = path.join(root, '.millennium', 'Dist', 'index.js');
    try {
        if (!(await readFile(bundle, 'utf8')).trim()) throw new Error('Empty bundle');
    } catch {
        throw new Error('Compiled frontend is missing or empty. Run npm run build before packaging.');
    }

    // Copy each required file explicitly so .millennium is retained and local
    // dependencies, frontend sources and credentials cannot enter the package.
    const destination = path.join(root, 'dist', manifest.name);
    await mkdir(path.join(destination, '.millennium', 'Dist'), { recursive: true });
    await cp(bundle, path.join(destination, '.millennium', 'Dist', 'index.js'));
    await cp(path.join(root, 'backend'), path.join(destination, 'backend'), { recursive: true });
    for (const filename of ['plugin.json', 'README.md', 'LICENSE']) {
        await cp(path.join(root, filename), path.join(destination, filename));
    }
    return destination;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        console.log(`Packaged plugin: ${await packagePlugin()}`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
