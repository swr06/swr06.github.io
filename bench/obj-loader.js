async function loadOBJ(url) {
    const response = await fetch(url);
    const text = await response.text();
    const positions = [];
    const normals = [];
    const vertices = [];

    const lines = text.split('\n');
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const type = parts.shift();

        if (type === 'v') {
            positions.push(parts.map(parseFloat));
        } else if (type === 'vn') {
            normals.push(parts.map(parseFloat));
        } else if (type === 'f') {
            for (let i = 0; i < parts.length - 2; i++) {
                for (let j = 0; j < 3; j++) {
                    const k = (j === 0) ? 0 : i + j;
                    const [p, t, n] = parts[k].split('/').map(s => parseInt(s, 10) - 1);
                    vertices.push(...positions[p]);
                }
            }
        }
    }
    return {
        positions: new Float32Array(vertices)
    };
}