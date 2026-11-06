import { strict as assert } from 'node:assert'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createCatalog } from '../src/catalog.js'

test('browser API lazily loads metadata and assigns the same avatar as PHP', async () => {
    const requests = []
    let failOnce = true
    const server = createServer(async (request, response) => {
        requests.push(request.url)
        if (request.url === '/assets/greek/catalog.json' && failOnce) {
            failOnce = false
            response.writeHead(503).end()
            return
        }
        if (!/^\/assets\/(?:(animals|art|egypt|greek|slavic)\/)?catalog\.json$/.test(request.url)) {
            response.writeHead(404).end()
            return
        }
        response.end(await readFile(new URL('..' + request.url, import.meta.url)))
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
        const catalog = createCatalog('http://127.0.0.1:' + server.address().port + '/assets')
        assert.deepEqual(requests, [])
        const [bear, animals] = await Promise.all([catalog.find('animals/bear'), catalog.avatars('animals')])
        assert.equal(animals.length, 31)
        assert.equal(bear.previewUrl.split('/assets/')[1], 'animals/preview-300px/bear.avif')
        assert.deepEqual(requests, ['/assets/catalog.json', '/assets/animals/catalog.json'])
        assert.equal(await catalog.find('../catalog.json'), null)
        assert.deepEqual(await catalog.avatars('invalid'), [])
        assert.equal(await catalog.pick('user-42', 'invalid'), null)
        await assert.rejects(catalog.avatars('greek'))
        assert.equal((await catalog.avatars('greek')).length, 20)

        const seeds = ['user-42', 'Łukasz-🏝', '', 'another-id']
        const actual = []
        for (const seed of seeds) {
            actual.push((await catalog.pick(seed)).id, (await catalog.pick(seed, 'egypt')).id)
        }
        const expected = JSON.parse(execFileSync('php', ['-r', [
            'require "src/Catalog.php";',
            '$catalog = new UseFlex\\Avatars\\Catalog();',
            '$results = [];',
            'foreach (json_decode($argv[1], true) as $seed) {',
            '$results[] = $catalog->pick($seed)["id"];',
            '$results[] = $catalog->pick($seed, "egypt")["id"];',
            '} echo json_encode($results);',
        ].join(' '), JSON.stringify(seeds)], { encoding: 'utf8' }))
        assert.deepEqual(actual, expected)
    } finally {
        await new Promise(resolve => server.close(resolve))
    }
})
