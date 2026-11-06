/**
 * Create a catalogue against a trusted, published FLEX Avatars assets directory.
 * Metadata is fetched on demand and shared within this catalogue instance.
 */
export function createCatalog(base = new URL('../assets/', import.meta.url)) {
    const root = new URL(base, import.meta.url)
    if (!root.pathname.endsWith('/')) root.pathname += '/'
    const pending = new Map()

    function load(path, transform) {
        if (!pending.has(path)) {
            const request = fetch(new URL(path, root))
                .then(response => {
                    if (!response.ok) throw new Error('Could not load the avatar catalogue.')
                    return response.json()
                })
                .then(transform)
                .catch(error => {
                    pending.delete(path)
                    throw error
                })
            pending.set(path, request)
        }
        return pending.get(path)
    }

    function collections() {
        return load('catalog.json', data => Object.freeze(data.collections.map(Object.freeze)))
    }

    async function avatars(collection) {
        if (!(await collections()).some(item => item.id === collection)) return []
        return load(collection + '/catalog.json', rows => Object.freeze(rows.map(item => Object.freeze({
            id: collection + '/' + item.id,
            collection,
            image: item.image,
            preview: item.preview,
            imageUrl: new URL(item.image, root).href,
            previewUrl: new URL(item.preview, root).href,
        }))))
    }

    async function find(id) {
        const parts = id.split('/')
        if (parts.length !== 2) return null
        return (await avatars(parts[0])).find(item => item.id === id) ?? null
    }

    async function pick(seed, collection = null) {
        const choices = (await collections()).filter(item => collection === null || item.id === collection)
        const total = choices.reduce((sum, item) => sum + item.count, 0)
        if (!total) return null

        const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed)))
        let offset = (new DataView(bytes.buffer).getUint32(0) >>> 4) % total
        for (const item of choices) {
            if (offset < item.count) return (await avatars(item.id))[offset]
            offset -= item.count
        }

        return null
    }

    return Object.freeze({ collections, avatars, find, pick })
}
