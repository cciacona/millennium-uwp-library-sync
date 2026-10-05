import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { packagePlugin } from '../scripts/package.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

async function fixture(t) {
    const root = await mkdtemp(path.join(tmpdir(), 'uwp-package-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    for (const filename of ['plugin.json', 'README.md', 'LICENSE', 'backend']) {
        await cp(path.join(repositoryRoot, filename), path.join(root, filename), { recursive: true });
    }
    return root;
}

test('an unbuilt source checkout cannot be packaged as an installable plugin', async (t) => {
    const root = await fixture(t);
    await assert.rejects(packagePlugin(root), /Run npm run build before packaging/);
    await assert.rejects(stat(path.join(root, 'dist')), { code: 'ENOENT' });
});

test('an empty frontend cannot be packaged', async (t) => {
    const root = await fixture(t);
    await mkdir(path.join(root, '.millennium', 'Dist'), { recursive: true });
    await writeFile(path.join(root, '.millennium', 'Dist', 'index.js'), '\n');
    await assert.rejects(packagePlugin(root), /Compiled frontend is missing or empty/);
});

test('the installable directory contains the frontend and all Lua backend modules', async (t) => {
    const root = await fixture(t);
    const bundle = 'window.PLUGIN_LIST = {};\n';
    await mkdir(path.join(root, '.millennium', 'Dist'), { recursive: true });
    await writeFile(path.join(root, '.millennium', 'Dist', 'index.js'), bundle);
    await mkdir(path.join(root, 'node_modules'), { recursive: true });
    await writeFile(path.join(root, 'node_modules', 'unwanted.txt'), 'not part of the plugin');

    const destination = await packagePlugin(root);
    assert.equal(path.basename(destination), '__uwp_library_sync__');
    assert.equal(await readFile(path.join(destination, '.millennium', 'Dist', 'index.js'), 'utf8'), bundle);
    for (const filename of ['main.lua', 'backend.lua', 'config.lua', 'client_manager.lua', 'uwp_discovery.lua', 'sync.lua', 'vdf.lua']) {
        assert.equal(
            await readFile(path.join(destination, 'backend', filename), 'utf8'),
            await readFile(path.join(root, 'backend', filename), 'utf8'),
        );
    }
    const manifest = JSON.parse(await readFile(path.join(destination, 'plugin.json'), 'utf8'));
    assert.equal(manifest.backendType, 'lua');
    assert.equal(manifest.useBackend, true);
    await assert.rejects(stat(path.join(destination, 'node_modules')), { code: 'ENOENT' });
    await assert.rejects(stat(path.join(destination, 'frontend')), { code: 'ENOENT' });
});
