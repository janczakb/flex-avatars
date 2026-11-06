import { createCatalog } from './src/catalog.js'

const catalog = createCatalog()
const nav = document.querySelector('#collections')
const gallery = document.querySelector('#avatars')
const heading = document.querySelector('#collection-title')
const status = document.querySelector('#status')
const dialog = document.querySelector('dialog')
const preview = document.querySelector('#preview')
const download = document.querySelector('#download')
let generation = 0

function showAvatar(avatar, label) {
    document.querySelector('#avatar-name').textContent = label
    document.querySelector('#avatar-id').textContent = avatar.id
    preview.alt = label
    preview.src = avatar.imageUrl
    download.href = avatar.imageUrl
    dialog.showModal()
}

document.querySelector('#close').addEventListener('click', () => dialog.close())
dialog.addEventListener('close', () => preview.removeAttribute('src'))

async function showCollection(collection) {
    const request = ++generation
    for (const button of nav.children) {
        button.setAttribute('aria-pressed', String(button.dataset.id === collection.id))
    }
    gallery.replaceChildren()
    heading.textContent = collection.label
    status.hidden = false
    status.textContent = 'Loading avatars…'

    try {
        const avatars = await catalog.avatars(collection.id)
        if (request !== generation) return
        const tiles = avatars.map(avatar => {
            const name = avatar.id.split('/')[1].replaceAll('-', ' ')
            const label = name.charAt(0).toUpperCase() + name.slice(1)
            const tile = document.createElement('button')
            tile.type = 'button'
            tile.className = 'tile'
            tile.setAttribute('aria-label', 'Preview ' + label)
            const image = new Image(300, 300)
            image.alt = ''
            image.loading = 'lazy'
            image.decoding = 'async'
            image.src = avatar.previewUrl
            tile.append(image)
            tile.addEventListener('click', () => showAvatar(avatar, label))
            return tile
        })
        gallery.replaceChildren(...tiles)
        status.hidden = true
    } catch {
        if (request === generation) status.textContent = 'Could not load avatars. Select the collection to try again.'
    }
}

try {
    const collections = await catalog.collections()
    for (const collection of collections) {
        const button = document.createElement('button')
        button.type = 'button'
        button.dataset.id = collection.id
        button.textContent = collection.label
        button.addEventListener('click', () => void showCollection(collection))
        nav.append(button)
    }
    await showCollection(collections[0])
} catch {
    status.textContent = 'Could not load the catalogue. Reload the page to try again.'
}
