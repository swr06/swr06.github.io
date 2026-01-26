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
            
            // Aspect Ratio Correction
            st.x *= u_resolution.x / u_resolution.y;
            
            vec3 color = vec3(0.0);
            
            // Star Density
            float density = 24.0; 
            vec2 grid_id = floor(st * density);

            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    vec2 neighbor_id = grid_id + vec2(x, y);
                    vec2 star_pos = vec2(random(neighbor_id));
                    
                    float star_size = (random(neighbor_id + vec2(1.0, 0.0)) * 0.006 + 0.003) * 9.0; 
                    
                    float pulse_speed = random(neighbor_id.yx) * 0.5 + 0.1; 
                    float pulse_phase = random(neighbor_id) * 6.28;
                    float pulse = (sin(u_time * pulse_speed + pulse_phase) + 1.0) * 0.5;
                    
                    float brightness = random(neighbor_id + vec2(0.0, 1.0)) * 1.0 + 0.5;
                    float dist = distance(fract(st * density), star_pos + vec2(x, y));
                    float star_intensity = 1.0 - smoothstep(0.0, star_size, dist);

                    color += star_intensity * brightness * 1.4 * pulse * vec3(0.9, 0.95, 1.0);
                }
            }
            
            // Background gradient (very subtle)
            color += vec3(0.02, 0.01, 0.03);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    function createShader(gl, type, source) { const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s); if(gl.getShaderParameter(s,gl.COMPILE_STATUS))return s; console.error(gl.getShaderInfoLog(s)); gl.deleteShader(s); }
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    function createProgram(gl,vs,fs) { const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p); if(gl.getProgramParameter(p,gl.LINK_STATUS))return p; console.error(gl.getProgramInfoLog(p)); gl.deleteProgram(p); }
    const program = createProgram(gl, vertexShader, fragmentShader);

    const posAttrLoc = gl.getAttribLocation(program, "a_position"), resUniLoc=gl.getUniformLocation(program, "u_resolution"), timeUniLoc=gl.getUniformLocation(program, "u_time");
    const posBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    function render(time) {
        time *= 0.003; 
        
        // Handle High DPI displays and Mobile resizing
        const displayWidth  = gl.canvas.clientWidth;
        const displayHeight = gl.canvas.clientHeight;
        const needResize = gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight;
        
        if (needResize) {
            gl.canvas.width  = displayWidth;
            gl.canvas.height = displayHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(program);
        gl.enableVertexAttribArray(posAttrLoc); gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); gl.vertexAttribPointer(posAttrLoc,2,gl.FLOAT,false,0,0);
        gl.uniform2f(resUniLoc, gl.canvas.width, gl.canvas.height); 
        gl.uniform1f(timeUniLoc, time); 
        gl.drawArrays(gl.TRIANGLES,0,6); 
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}