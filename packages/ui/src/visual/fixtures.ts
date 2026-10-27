// A small inline image keeps screenshots free of network access.
const IMAGE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">' +
    '<rect width="40" height="40" fill="#e8590c"/>' +
    '<circle cx="20" cy="20" r="12" fill="#fab005"/>' +
    '<rect x="4" y="30" width="32" height="6" fill="#1c7ed6"/>' +
    "</svg>"

export const IMAGE_DATA_URI = `data:image/svg+xml;base64,${btoa(IMAGE_SVG)}`
