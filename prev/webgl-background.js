const canvas = document.getElementById('gl-canvas');
const gl = canvas.getContext('webgl', { antialias: false });

if (!gl) {
    console.error("WebGL not supported!");
} else {
    const vertexShaderSource = `
        attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;

    const fragmentShaderSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;

        float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }

        void main() {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            
            // NEW: Barrel Distortion for CRT curvature
            vec2 center = st - 0.5;
            float dist = dot(center, center);
            st = center * (1.0 - dist * 0.1) + 0.5;

            // NEW: Scanline jitter/wobble effect
            st.y += sin(st.y * 500.0 + u_time * 5.0) * 0.001;
            
            st.x *= u_resolution.x / u_resolution.y;
            vec3 color = vec3(0.0);
            
            float slow_time = u_time * 0.02;

            // CRITICAL FIX: Less dense stars
            float density = 24.0; 
            vec2 grid_id = floor(st * density);

            for (int y = -2; y <= 2; y++) {
                for (int x = -2; x <= 2; x++) {
                    vec2 neighbor_id = grid_id + vec2(x, y);

                    vec2 star_pos = vec2(random(neighbor_id));
                    
                    // CRITICAL FIX: Smaller stars
                    float star_size = (random(neighbor_id + vec2(1.0, 0.0)) * 0.00625 + 0.003125) * 9.0; 
                    
                    // CRITICAL FIX: Slower twinkle
                    float pulse_speed = random(neighbor_id.yx) * 0.025 + 0.0125; 
                    float pulse_phase = random(neighbor_id) * 6.28;
                    float pulse = (sin(u_time * pulse_speed + pulse_phase) + 1.0) * 0.5;
                    
                    float brightness = random(neighbor_id + vec2(0.0, 1.0)) * 1.2 + 0.6;

                    float dist = distance(fract(st * density), star_pos + vec2(x, y));
                    float star_intensity = 1.0 - smoothstep(0.0, star_size, dist);

                    color += star_intensity * brightness * pulse * vec3(1.0, 1.0, 1.2);
                }
            }
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // --- WebGL Boilerplate ---
    function createShader(gl, type, source) { const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s); if(gl.getShaderParameter(s,gl.COMPILE_STATUS))return s; console.error(gl.getShaderInfoLog(s)); gl.deleteShader(s); }
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    function createProgram(gl,vs,fs) { const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p); if(gl.getProgramParameter(p,gl.LINK_STATUS))return p; console.error(gl.getProgramInfoLog(p)); gl.deleteProgram(p); }
    const program = createProgram(gl, vertexShader, fragmentShader);

    const posAttrLoc = gl.getAttribLocation(program, "a_position"), resUniLoc=gl.getUniformLocation(program, "u_resolution"), timeUniLoc=gl.getUniformLocation(program, "u_time");
    const posBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    function render(time) {
        time *= 0.001; const w=gl.canvas.clientWidth, h=gl.canvas.clientHeight; if(gl.canvas.width!==w||gl.canvas.height!==h){gl.canvas.width=w;gl.canvas.height=h;}
        gl.viewport(0,0,w,h); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(program);
        gl.enableVertexAttribArray(posAttrLoc); gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); gl.vertexAttribPointer(posAttrLoc,2,gl.FLOAT,false,0,0);
        gl.uniform2f(resUniLoc,w,h); gl.uniform1f(timeUniLoc,time); gl.drawArrays(gl.TRIANGLES,0,6); requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}