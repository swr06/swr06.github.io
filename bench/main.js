async function main() {
    // --- Basic WebGL and page setup ---
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) { alert('WebGL 2 is not available on your browser.'); return; }

    // --- UI Elements ---
    const infoLeft = document.getElementById('info-left');
    const infoRight = document.getElementById('info-right');
    const renderProbesButton = document.getElementById('render-probes-button');
    const dragonSlider = document.getElementById('dragon-slider');
    const dragonCountDisplay = document.getElementById('dragon-count-display');

    // --- State Variables ---
    let lastFrameTime = 0;
    let dragonsToRender = parseInt(dragonSlider.value, 10);

    // --- OBJ Loader (Calculates flat normals) ---
    async function loadOBJ(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load OBJ: ${url}`);
        const text = await response.text();
        const positions = [], normals = [], vertexPositions = [];
        for (const line of text.split('\n')) {
            const parts = line.trim().split(/\s+/);
            const type = parts.shift();
            if (type === 'v') {
                vertexPositions.push(parts.map(p => parseFloat(p)));
            } else if (type === 'f') {
                const faceVertices = parts.map(p => vertexPositions[parseInt(p.split('/')[0], 10) - 1]);
                for (let i = 1; i < faceVertices.length - 1; i++) {
                    const [v1, v2, v3] = [faceVertices[0], faceVertices[i], faceVertices[i + 1]];
                    positions.push(...v1, ...v2, ...v3);
                    const edge1 = vec3.subtract(vec3.create(), v2, v1);
                    const edge2 = vec3.subtract(vec3.create(), v3, v1);
                    const normal = vec3.cross(vec3.create(), edge1, edge2);
                    vec3.normalize(normal, normal);
                    normals.push(...normal, ...normal, ...normal);
                }
            }
        }
        return { positions: new Float32Array(positions), normals: new Float32Array(normals) };
    }

    // --- Shader Utilities ---
    const createShader = (gl, type, source) => {
        const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
    };
    const createProgram = (gl, vs, fs) => {
        const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        return p;
    };

    // --- Shader Definitions ---
    const dragonVertexShader = `#version 300 es
        in vec4 a_position; in vec3 a_normal; uniform mat4 u_projection, u_view, u_model; out vec3 v_normal;
        void main() { gl_Position = u_projection * u_view * u_model * a_position; v_normal = normalize(mat3(u_model) * a_normal); }`;
    const dragonFragmentShader = `#version 300 es
        precision highp float; in vec3 v_normal; out vec4 c; uniform vec3 u_lightDir, u_ambient;
        void main() { c = vec4(u_ambient + vec3(0.95, 0.75, 0.3) * max(dot(v_normal, u_lightDir), 0.0), 1.0); }`;
    const reflectiveCubeVertexShader = `#version 300 es
        in vec4 a_pos; in vec3 a_norm; uniform mat4 u_proj, u_view, u_model; uniform vec3 u_camPos; out vec3 v_refl;
        void main() { vec4 worldPos = u_model*a_pos; v_refl = reflect(normalize(worldPos.xyz - u_camPos), normalize(mat3(u_model)*a_norm)); gl_Position=u_proj*u_view*worldPos; }`;
    const uvCubeVertexShader = `#version 300 es
        in vec4 a_pos; uniform mat4 u_proj, u_view, u_model; out vec3 v_texCoord;
        void main() { v_texCoord = a_pos.xyz; gl_Position = u_proj * u_view * u_model * a_pos; }`;
    const cubemapFragmentShader = `#version 300 es
        precision highp float; in vec3 v_refl; uniform samplerCube u_cubemap; out vec4 c; void main() { c = texture(u_cubemap, v_refl); }`;
    const uvCubemapFragmentShader = `#version 300 es
        precision highp float; in vec3 v_texCoord; uniform samplerCube u_cubemap; out vec4 c; void main() { c = texture(u_cubemap, normalize(v_texCoord)); }`;

    // --- Create Programs ---
    const dragonProgram = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, dragonVertexShader), createShader(gl, gl.FRAGMENT_SHADER, dragonFragmentShader));
    const reflectiveCubeProgram = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, reflectiveCubeVertexShader), createShader(gl, gl.FRAGMENT_SHADER, cubemapFragmentShader));
    const uvCubeProgram = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, uvCubeVertexShader), createShader(gl, gl.FRAGMENT_SHADER, uvCubemapFragmentShader));

    // --- Load Models and VAOs ---
    const dragon = await loadOBJ('dragon.obj');
    const dragonVao = gl.createVertexArray();
    gl.bindVertexArray(dragonVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, dragon.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, dragon.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const cubeVao = gl.createVertexArray();
    gl.bindVertexArray(cubeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5,-0.5,-0.5,0,0,-1,.5,-0.5,-0.5,0,0,-1,.5,.5,-0.5,0,0,-1,-.5,.5,-0.5,0,0,-1,-.5,-0.5,.5,0,0,1,.5,-0.5,.5,0,0,1,.5,.5,.5,0,0,1,-.5,.5,.5,0,0,1,-.5,.5,-0.5,0,1,0,-.5,.5,.5,0,1,0,.5,.5,.5,0,1,0,.5,.5,-0.5,0,1,0,-.5,-0.5,-0.5,0,-1,0,-.5,-0.5,.5,0,-1,0,.5,-0.5,.5,0,-1,0,.5,-0.5,-0.5,0,-1,0,.5,-0.5,-0.5,1,0,0,.5,.5,-0.5,1,0,0,.5,.5,.5,1,0,0,.5,-0.5,.5,1,0,0,-.5,-0.5,-0.5,-1,0,0,-.5,.5,-0.5,-1,0,0,-.5,.5,.5,-1,0,0,-.5,-0.5,.5,-1,0,0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11,12,13,14,12,14,15,16,17,18,16,18,19,20,21,22,20,22,23]), gl.STATIC_DRAW);

    // --- Cubemap Resources ---
    const CUBEMAP_SIZE = 512;
    const cubemap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemap);
    for (let i = 0; i < 6; i++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, CUBEMAP_SIZE, CUBEMAP_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const fbo = gl.createFramebuffer();
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, CUBEMAP_SIZE, CUBEMAP_SIZE);

    // --- Matrices & Render Data ---
    const probeProjectionMatrix = mat4.perspective(mat4.create(), Math.PI / 2, 1.0, 0.1, 20.0);
    
    // *** UPDATED DRAGON PROBE MATRIX ***
    // This matrix defines the dragon's properties for rendering into the cubemap.
    // It's moved closer to account for the smaller scale.
    const dragonProbeModelMatrix = mat4.fromTranslation(mat4.create(), [0, -0.1, -0.8]);
    mat4.scale(dragonProbeModelMatrix, dragonProbeModelMatrix, [0.2, 0.2, 0.2]); // <-- New 0.2 scale

    const mainProjectionMatrix = mat4.create(), mainViewMatrix = mat4.create(), cameraPosition = vec3.create();
    const reflectiveCubeModelMatrix = mat4.create(), uvCubeModelMatrix = mat4.create(), mainDragonModelMatrix = mat4.create();

    const probeTargets = [
        { t: gl.TEXTURE_CUBE_MAP_POSITIVE_X, l: [1,0,0], u: [0,-1,0] }, { t: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, l: [-1,0,0], u: [0,-1,0] },
        { t: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, l: [0,1,0], u: [0,0,1] }, { t: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, l: [0,-1,0], u: [0,0,-1] },
        { t: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, l: [0,0,1], u: [0,-1,0] }, { t: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, l: [0,0,-1], u: [0,-1,0] },
    ];
    const instanceRotations = Array.from({length: 200000}, () => mat4.fromRotation(mat4.create(), Math.random() * Math.PI * 2, [Math.random(), Math.random(), Math.random()]));

    // --- CORE RENDER FUNCTIONS ---
    function generateProbes(numInstances) {
        infoLeft.textContent = `Rendering ${numInstances.toLocaleString('en-US')} dragons per face...`;
        gl.enable(gl.DEPTH_TEST);
        const start = performance.now();
        for (const { t, l, u } of probeTargets) {
            const probeViewMatrix = mat4.lookAt(mat4.create(), [0,0,0], l, u);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, t, cubemap, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
            gl.viewport(0, 0, CUBEMAP_SIZE, CUBEMAP_SIZE);
            gl.clearColor(0.2, 0.25, 0.3, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.useProgram(dragonProgram);
            gl.uniformMatrix4fv(gl.getUniformLocation(dragonProgram, 'u_projection'), false, probeProjectionMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(dragonProgram, 'u_view'), false, probeViewMatrix);
            gl.uniform3fv(gl.getUniformLocation(dragonProgram, 'u_lightDir'), [0.5, 0.8, 0.6]);
            gl.uniform3fv(gl.getUniformLocation(dragonProgram, 'u_ambient'), [0.2, 0.2, 0.2]);
            gl.bindVertexArray(dragonVao);
            const modelMatrix = mat4.create();
            for (let i = 0; i < numInstances; i++) {
                mat4.multiply(modelMatrix, dragonProbeModelMatrix, instanceRotations[i]);
                gl.uniformMatrix4fv(gl.getUniformLocation(dragonProgram, 'u_model'), false, modelMatrix);
                gl.drawArrays(gl.TRIANGLES, 0, dragon.positions.length / 3);
            }
        }
        gl.finish();
        const end = performance.now();
        const totalDragons = (numInstances * 6).toLocaleString('en-US');
        infoLeft.textContent = `Time to render ${totalDragons} dragons:\n${(end - start).toFixed(3)} ms`;
    }

    function renderScene(time) {
        const now = performance.now();
        const fps = 1000 / (now - lastFrameTime);
        lastFrameTime = now;
        infoRight.textContent = `Display FPS: ${fps.toFixed(1)}`;
        gl.enable(gl.DEPTH_TEST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.2, 0.2, 0.2, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.perspective(mainProjectionMatrix, Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 100);
        vec3.set(cameraPosition, 0, 1.5, 5);
        mat4.lookAt(mainViewMatrix, cameraPosition, [0, 0, 0], [0, 1, 0]);
        
        // --- Render Dragon in the main scene ---
        mat4.fromYRotation(mainDragonModelMatrix, time * 0.0003);
        mat4.translate(mainDragonModelMatrix, mainDragonModelMatrix, [-2.2, 0, 0]);
        mat4.scale(mainDragonModelMatrix, mainDragonModelMatrix, [0.2, 0.2, 0.2]); // <-- New 0.2 scale for main scene
        gl.useProgram(dragonProgram);
        gl.uniformMatrix4fv(gl.getUniformLocation(dragonProgram, 'u_projection'), false, mainProjectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(dragonProgram, 'u_view'), false, mainViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(dragonProgram, 'u_model'), false, mainDragonModelMatrix);
        gl.uniform3fv(gl.getUniformLocation(dragonProgram, 'u_lightDir'), [0.8, 1.0, 0.5]);
        gl.uniform3fv(gl.getUniformLocation(dragonProgram, 'u_ambient'), [0.25, 0.25, 0.25]);
        gl.bindVertexArray(dragonVao);
        gl.drawArrays(gl.TRIANGLES, 0, dragon.positions.length / 3);

        // --- Render Cubes ---
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemap);

        // Cube 1: Reflective
        mat4.fromYRotation(reflectiveCubeModelMatrix, time * 0.0002);
        mat4.translate(reflectiveCubeModelMatrix, reflectiveCubeModelMatrix, [0.0, 0, 0]);
        gl.useProgram(reflectiveCubeProgram);
        gl.uniformMatrix4fv(gl.getUniformLocation(reflectiveCubeProgram, 'u_proj'), false, mainProjectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(reflectiveCubeProgram, 'u_view'), false, mainViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(reflectiveCubeProgram, 'u_model'), false, reflectiveCubeModelMatrix);
        gl.uniform3fv(gl.getUniformLocation(reflectiveCubeProgram, 'u_camPos'), cameraPosition);
        gl.uniform1i(gl.getUniformLocation(reflectiveCubeProgram, 'u_cubemap'), 0);
        gl.bindVertexArray(cubeVao);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        // Cube 2: UV-mapped
        mat4.fromYRotation(uvCubeModelMatrix, time * 0.0002);
        mat4.translate(uvCubeModelMatrix, uvCubeModelMatrix, [1.5, 0, 0]);
        gl.useProgram(uvCubeProgram);
        gl.uniformMatrix4fv(gl.getUniformLocation(uvCubeProgram, 'u_proj'), false, mainProjectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(uvCubeProgram, 'u_view'), false, mainViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(uvCubeProgram, 'u_model'), false, uvCubeModelMatrix);
        gl.uniform1i(gl.getUniformLocation(uvCubeProgram, 'u_cubemap'), 0);
        gl.bindVertexArray(cubeVao);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(renderScene);
    }
    
    // --- UI Event Listeners ---
    dragonSlider.addEventListener('input', (e) => {
        dragonsToRender = parseInt(e.target.value, 10);
        dragonCountDisplay.textContent = dragonsToRender.toLocaleString('en-US');
    });

    renderProbesButton.addEventListener('click', () => {
        renderProbesButton.disabled = true;
        renderProbesButton.textContent = "Rendering...";
        requestAnimationFrame(() => {
            generateProbes(dragonsToRender);
            renderProbesButton.disabled = false;
            renderProbesButton.textContent = "Render Probes Once";
        });
    });

    // --- INITIALIZATION ---
    infoLeft.textContent = "Click 'Render Probes Once' to start.";
    generateProbes(1); 
    requestAnimationFrame(renderScene);
}

main().catch(console.error);