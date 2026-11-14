import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../services/audioEngine';

type Geometry = {
  positions: number[];
  normals: number[];
  colors?: number[];
};

type GpuMesh = {
  position: WebGLBuffer;
  normal: WebGLBuffer;
  color: WebGLBuffer;
  vertexCount: number;
  mode: number;
};

type DrawCommand = {
  mesh: GpuMesh;
  model: Float32Array;
  color: number[];
  pointSize?: number;
  castsShadow?: boolean;
};

type SceneProps = {
  active: boolean;
};

const vertexShaderSource = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec4 aColor;
  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uModel;
  uniform mat4 uLightViewProjection;
  uniform float uPointSize;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec4 vShadowPosition;
  varying vec4 vColor;

  void main() {
    vec4 worldPosition = uModel * vec4(aPosition, 1.0);
    vec4 eyePosition = uView * worldPosition;
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(uModel) * aNormal);
    vShadowPosition = uLightViewProjection * worldPosition;
    vColor = aColor;
    gl_Position = uProjection * eyePosition;
    gl_PointSize = uPointSize * (5.0 / max(2.0, -eyePosition.z));
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec3 uLightPosition;
  uniform vec3 uCameraPosition;
  uniform vec4 uTint;
  uniform sampler2D uShadowMap;
  uniform samplerCube uEnvironmentMap;
  uniform vec2 uShadowTexel;
  uniform float uUseShadowMap;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec4 vShadowPosition;
  varying vec4 vColor;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDirection = normalize(uLightPosition - vWorldPosition);
    vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
    float visibility = 1.0;
    vec3 shadowCoord = vShadowPosition.xyz / max(vShadowPosition.w, 0.0001);
    shadowCoord = shadowCoord * 0.5 + 0.5;
    if (uUseShadowMap > 0.5 && shadowCoord.x > 0.0 && shadowCoord.x < 1.0 && shadowCoord.y > 0.0 && shadowCoord.y < 1.0 && shadowCoord.z > 0.0 && shadowCoord.z < 1.0) {
      float shadowAmount = 0.0;
      for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
          float storedDepth = texture2D(uShadowMap, shadowCoord.xy + vec2(float(x), float(y)) * uShadowTexel).r;
          shadowAmount += shadowCoord.z - 0.0032 > storedDepth ? 1.0 : 0.0;
        }
      }
      visibility = 1.0 - shadowAmount * 0.055;
    }
    float diffuse = 0.25 + max(dot(normal, lightDirection), 0.0) * 0.75 * visibility;
    float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 30.0) * 0.34;
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.7) * 0.48;
    vec4 color = vColor * uTint;
    vec3 reflectedEnvironment = textureCube(uEnvironmentMap, reflect(-viewDirection, normal)).rgb;
    gl_FragColor = vec4(color.rgb * (diffuse + specular + rim) + reflectedEnvironment * (0.1 + rim * 0.34), color.a);
  }
`;

const shadowVertexShaderSource = `
  attribute vec3 aPosition;
  uniform mat4 uModel;
  uniform mat4 uLightViewProjection;
  void main() {
    gl_Position = uLightViewProjection * uModel * vec4(aPosition, 1.0);
  }
`;

const shadowFragmentShaderSource = `
  precision mediump float;
  void main() {
    gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
  }
`;

const unitColor: number[] = [1, 1, 1, 1];

function pushTriangle(geometry: Geometry, a: number[], b: number[], c: number[], na: number[], nb = na, nc = na) {
  geometry.positions.push(...a, ...b, ...c);
  geometry.normals.push(...na, ...nb, ...nc);
}

function createTorus(majorRadius: number, tubeRadius: number, majorSegments = 64, tubeSegments = 10): Geometry {
  const geometry: Geometry = { positions: [], normals: [] };
  const point = (u: number, v: number) => {
    const cosV = Math.cos(v);
    const sinV = Math.sin(v);
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);
    const radius = majorRadius + tubeRadius * cosV;
    return {
      position: [radius * cosU, radius * sinU, tubeRadius * sinV],
      normal: [cosV * cosU, cosV * sinU, sinV],
    };
  };

  for (let i = 0; i < majorSegments; i++) {
    const u0 = (i / majorSegments) * Math.PI * 2;
    const u1 = ((i + 1) / majorSegments) * Math.PI * 2;
    for (let j = 0; j < tubeSegments; j++) {
      const v0 = (j / tubeSegments) * Math.PI * 2;
      const v1 = ((j + 1) / tubeSegments) * Math.PI * 2;
      const p00 = point(u0, v0);
      const p10 = point(u1, v0);
      const p01 = point(u0, v1);
      const p11 = point(u1, v1);
      pushTriangle(geometry, p00.position, p10.position, p11.position, p00.normal, p10.normal, p11.normal);
      pushTriangle(geometry, p00.position, p11.position, p01.position, p00.normal, p11.normal, p01.normal);
    }
  }
  return geometry;
}

function createCylinder(radius: number, depth: number, segments = 40): Geometry {
  const geometry: Geometry = { positions: [], normals: [] };
  const halfDepth = depth / 2;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const p0 = [Math.cos(a0) * radius, Math.sin(a0) * radius];
    const p1 = [Math.cos(a1) * radius, Math.sin(a1) * radius];
    const n0 = [Math.cos(a0), Math.sin(a0), 0];
    const n1 = [Math.cos(a1), Math.sin(a1), 0];
    const a = [p0[0], p0[1], -halfDepth];
    const b = [p1[0], p1[1], -halfDepth];
    const c = [p1[0], p1[1], halfDepth];
    const d = [p0[0], p0[1], halfDepth];
    pushTriangle(geometry, a, b, c, n0, n1, n1);
    pushTriangle(geometry, a, c, d, n0, n1, n0);
    pushTriangle(geometry, [0, 0, halfDepth], d, c, [0, 0, 1], [0, 0, 1], [0, 0, 1]);
    pushTriangle(geometry, [0, 0, -halfDepth], b, a, [0, 0, -1], [0, 0, -1], [0, 0, -1]);
  }
  return geometry;
}

function createBox(width = 1, height = 1, depth = 1): Geometry {
  const geometry: Geometry = { positions: [], normals: [] };
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const faces = [
    { n: [0, 0, 1], v: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },
    { n: [0, 0, -1], v: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] },
    { n: [1, 0, 0], v: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },
    { n: [-1, 0, 0], v: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] },
    { n: [0, 1, 0], v: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]] },
    { n: [0, -1, 0], v: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] },
  ];
  for (const face of faces) {
    const [a, b, c, d] = face.v;
    pushTriangle(geometry, a, b, c, face.n);
    pushTriangle(geometry, a, c, d, face.n);
  }
  return geometry;
}

function createSphere(radius = 0.5, latSegments = 16, lonSegments = 24): Geometry {
  const geometry: Geometry = { positions: [], normals: [] };
  const point = (lat: number, lon: number) => {
    const y = Math.cos(lat);
    const ring = Math.sin(lat);
    const normal = [ring * Math.cos(lon), y, ring * Math.sin(lon)];
    return { position: normal.map((component) => component * radius), normal };
  };
  for (let latIndex = 0; latIndex < latSegments; latIndex++) {
    const lat0 = (latIndex / latSegments) * Math.PI;
    const lat1 = ((latIndex + 1) / latSegments) * Math.PI;
    for (let lonIndex = 0; lonIndex < lonSegments; lonIndex++) {
      const lon0 = (lonIndex / lonSegments) * Math.PI * 2;
      const lon1 = ((lonIndex + 1) / lonSegments) * Math.PI * 2;
      const a = point(lat0, lon0);
      const b = point(lat1, lon0);
      const c = point(lat1, lon1);
      const d = point(lat0, lon1);
      pushTriangle(geometry, a.position, b.position, c.position, a.normal, b.normal, c.normal);
      pushTriangle(geometry, a.position, c.position, d.position, a.normal, c.normal, d.normal);
    }
  }
  return geometry;
}

function createOctahedron(radius = 0.45): Geometry {
  const geometry: Geometry = { positions: [], normals: [] };
  const top = [0, radius, 0];
  const bottom = [0, -radius, 0];
  const front = [0, 0, radius];
  const back = [0, 0, -radius];
  const left = [-radius, 0, 0];
  const right = [radius, 0, 0];
  const faces = [
    [top, front, right], [top, left, front], [top, back, left], [top, right, back],
    [bottom, right, front], [bottom, front, left], [bottom, left, back], [bottom, back, right],
  ];
  for (const [a, b, c] of faces) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = normalize([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
    pushTriangle(geometry, a, b, c, normal);
  }
  return geometry;
}

function createArcTube(majorRadius: number, tubeRadius: number, segments = 44, tubeSegments = 10): Geometry {
  const geometry: Geometry = { positions: [], normals: [] };
  const point = (u: number, v: number) => {
    const radial = [Math.cos(u), Math.sin(u), 0];
    const position = [
      (majorRadius + tubeRadius * Math.cos(v)) * Math.cos(u),
      (majorRadius + tubeRadius * Math.cos(v)) * Math.sin(u),
      tubeRadius * Math.sin(v),
    ];
    return { position, normal: [radial[0] * Math.cos(v), radial[1] * Math.cos(v), Math.sin(v)] };
  };
  for (let i = 0; i < segments; i++) {
    const u0 = (i / segments) * Math.PI;
    const u1 = ((i + 1) / segments) * Math.PI;
    for (let j = 0; j < tubeSegments; j++) {
      const v0 = (j / tubeSegments) * Math.PI * 2;
      const v1 = ((j + 1) / tubeSegments) * Math.PI * 2;
      const a = point(u0, v0);
      const b = point(u1, v0);
      const c = point(u1, v1);
      const d = point(u0, v1);
      pushTriangle(geometry, a.position, b.position, c.position, a.normal, b.normal, c.normal);
      pushTriangle(geometry, a.position, c.position, d.position, a.normal, c.normal, d.normal);
    }
  }
  return geometry;
}

function mergeGeometry(geometries: Geometry[]): Geometry {
  return geometries.reduce<Geometry>((merged, geometry) => {
    merged.positions.push(...geometry.positions);
    merged.normals.push(...geometry.normals);
    if (geometry.colors) merged.colors = [...(merged.colors || []), ...geometry.colors];
    return merged;
  }, { positions: [], normals: [] });
}

function createParticles(count = 150): Geometry {
  const geometry: Geometry = { positions: [], normals: [], colors: [] };
  let seed = 481516;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    const x = (random() - 0.5) * 8.5;
    const y = (random() - 0.5) * 5.2;
    const z = -1.5 - random() * 3.5;
    geometry.positions.push(x, y, z);
    geometry.normals.push(0, 0, 1);
    const cyan = random() > 0.68;
    geometry.colors?.push(cyan ? 0.48 : 0.75, cyan ? 0.88 : 0.52, cyan ? 0.96 : 0.96, 0.45 + random() * 0.4);
  }
  return geometry;
}

function normalize(vector: number[]): number[] {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

function identity(): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let value = 0;
      for (let index = 0; index < 4; index++) value += a[index * 4 + row] * b[column * 4 + index];
      result[column * 4 + row] = value;
    }
  }
  return result;
}

function translate(x: number, y: number, z: number): Float32Array {
  const matrix = identity();
  matrix[12] = x;
  matrix[13] = y;
  matrix[14] = z;
  return matrix;
}

function scale(x: number, y: number, z: number): Float32Array {
  const matrix = identity();
  matrix[0] = x;
  matrix[5] = y;
  matrix[10] = z;
  return matrix;
}

function rotateX(angle: number): Float32Array {
  const matrix = identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  matrix[5] = c; matrix[6] = s;
  matrix[9] = -s; matrix[10] = c;
  return matrix;
}

function rotateY(angle: number): Float32Array {
  const matrix = identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  matrix[0] = c; matrix[2] = -s;
  matrix[8] = s; matrix[10] = c;
  return matrix;
}

function rotateZ(angle: number): Float32Array {
  const matrix = identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  matrix[0] = c; matrix[1] = s;
  matrix[4] = -s; matrix[5] = c;
  return matrix;
}

function perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fov / 2);
  const range = 1 / (near - far);
  const matrix = new Float32Array(16);
  matrix[0] = f / aspect;
  matrix[5] = f;
  matrix[10] = (near + far) * range;
  matrix[11] = -1;
  matrix[14] = near * far * 2 * range;
  return matrix;
}

function orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array {
  const matrix = identity();
  matrix[0] = 2 / (right - left);
  matrix[5] = 2 / (top - bottom);
  matrix[10] = -2 / (far - near);
  matrix[12] = -(right + left) / (right - left);
  matrix[13] = -(top + bottom) / (top - bottom);
  matrix[14] = -(far + near) / (far - near);
  return matrix;
}

function lookAt(eye: number[], target: number[], up: number[]): Float32Array {
  const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = normalize([up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const matrix = identity();
  matrix[0] = x[0]; matrix[1] = y[0]; matrix[2] = z[0];
  matrix[4] = x[1]; matrix[5] = y[1]; matrix[6] = z[1];
  matrix[8] = x[2]; matrix[9] = y[2]; matrix[10] = z[2];
  matrix[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  matrix[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  matrix[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
  return matrix;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource = vertexShaderSource,
  fragmentSource = fragmentShaderSource,
): WebGLProgram {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('WebGL shader allocation failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'WebGL shader compilation failed';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  };
  const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('WebGL program allocation failed');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'WebGL program link failed';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function createEnvironmentMap(gl: WebGLRenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('WebGL reflection texture allocation failed');
  const size = 24;
  const faces = [
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, top: [28, 20, 56], bottom: [110, 72, 148], light: [165, 118, 235] },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, top: [18, 28, 63], bottom: [74, 62, 126], light: [105, 200, 231] },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, top: [27, 19, 61], bottom: [96, 83, 139], light: [182, 139, 241] },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, top: [13, 13, 28], bottom: [60, 37, 81], light: [235, 138, 102] },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, top: [20, 23, 56], bottom: [88, 64, 137], light: [138, 230, 242] },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, top: [12, 12, 29], bottom: [48, 33, 81], light: [142, 87, 204] },
  ];
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  faces.forEach((face, faceIndex) => {
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const vertical = y / (size - 1);
        const dx = (x / (size - 1) - (faceIndex % 2 ? 0.34 : 0.68)) * 2.4;
        const dy = (vertical - (faceIndex % 3 === 0 ? 0.42 : 0.58)) * 2.1;
        const highlight = Math.exp(-(dx * dx + dy * dy) * 7.5) * 0.6;
        const offset = (y * size + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const base = face.top[channel] * (1 - vertical) + face.bottom[channel] * vertical;
          pixels[offset + channel] = Math.min(255, Math.round(base + face.light[channel] * highlight));
        }
        pixels[offset + 3] = 255;
      }
    }
    gl.texImage2D(face.target, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  });
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function createShadowTarget(gl: WebGLRenderingContext, size: number) {
  const framebuffer = gl.createFramebuffer();
  const texture = gl.createTexture();
  const depthBuffer = gl.createRenderbuffer();
  if (!framebuffer || !texture || !depthBuffer) throw new Error('WebGL shadow target allocation failed');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  if (!complete) {
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    gl.deleteRenderbuffer(depthBuffer);
    throw new Error('WebGL shadow framebuffer is incomplete');
  }
  return { framebuffer, texture, depthBuffer, size };
}

function createFallbackShadowTexture(gl: WebGLRenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('WebGL fallback shadow texture allocation failed');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export const UniverseScene: React.FC<SceneProps> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const amplitudesRef = useRef<number[]>(new Array(32).fill(0.12));
  const redrawRef = useRef<(() => void) | null>(null);
  const [webglAvailable, setWebglAvailable] = useState(true);

  useEffect(() => {
    activeRef.current = active;
    redrawRef.current?.();
  }, [active]);

  useEffect(() => audioEngine.subscribeWaveform((amplitudes) => {
    // The active landing-scene loop reads the same waveform feed as the audio UI.
    amplitudesRef.current = amplitudes;
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: true,
        powerPreference: 'low-power',
        premultipliedAlpha: false,
      });
    } catch {
      gl = null;
    }
    if (!gl) {
      setWebglAvailable(false);
      return;
    }

    let program: WebGLProgram | null = null;
    let shadowProgram: WebGLProgram | null = null;
    let environmentTexture: WebGLTexture | null = null;
    let fallbackShadowTexture: WebGLTexture | null = null;
    let shadowTarget: ReturnType<typeof createShadowTarget> | null = null;
    const meshes: GpuMesh[] = [];
    let animationFrame = 0;
    let disposed = false;
    let contextLost = false;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let pointerX = 0;
    let pointerY = 0;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let lastDraw = 0;
    let isIntersecting = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const createMesh = (geometry: Geometry, mode: number = gl.TRIANGLES) => {
      const createBuffer = (data: number[], size: number, fallback: number[]) => {
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error('WebGL buffer allocation failed');
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.length ? data : fallback), gl.STATIC_DRAW);
        return { buffer, size };
      };
      const vertexCount = geometry.positions.length / 3;
      const defaultColors = Array.from({ length: vertexCount }, () => unitColor).flat();
      const position = createBuffer(geometry.positions, 3, []);
      const normal = createBuffer(geometry.normals, 3, []);
      const color = createBuffer(geometry.colors || defaultColors, 4, []);
      const mesh = { position: position.buffer, normal: normal.buffer, color: color.buffer, vertexCount, mode };
      meshes.push(mesh);
      return mesh;
    };

    let portalOuter: GpuMesh;
    let portalInner: GpuMesh;
    let portalOrbit: GpuMesh;
    let portalTilt: GpuMesh;
    let vinylBody: GpuMesh;
    let vinylGrooves: GpuMesh;
    let vinylLabel: GpuMesh;
    let headphoneBand: GpuMesh;
    let headphoneCup: GpuMesh;
    let headphoneTrim: GpuMesh;
    let crystal: GpuMesh;
    let sphere: GpuMesh;
    let islandTop: GpuMesh;
    let islandBase: GpuMesh;
    let panel: GpuMesh;
    let bar: GpuMesh;
    let particles: GpuMesh;
    let backdrop: GpuMesh;
    let attributeLocations: { position: number; normal: number; color: number };
    let uniformLocations: {
      projection: WebGLUniformLocation;
      view: WebGLUniformLocation;
      model: WebGLUniformLocation;
      light: WebGLUniformLocation;
      camera: WebGLUniformLocation;
      tint: WebGLUniformLocation;
      pointSize: WebGLUniformLocation;
      lightViewProjection: WebGLUniformLocation;
      shadowMap: WebGLUniformLocation;
      environmentMap: WebGLUniformLocation;
      shadowTexel: WebGLUniformLocation;
      useShadowMap: WebGLUniformLocation;
    };
    let shadowAttributePosition = -1;
    let shadowModelUniform: WebGLUniformLocation | null = null;
    let shadowLightViewProjectionUniform: WebGLUniformLocation | null = null;

    try {
      program = createProgram(gl);
      environmentTexture = createEnvironmentMap(gl);
      try {
        shadowTarget = createShadowTarget(gl, window.innerWidth < 700 ? 384 : 768);
      } catch {
        shadowTarget = null;
        fallbackShadowTexture = createFallbackShadowTexture(gl);
      }
      try {
        shadowProgram = createProgram(gl, shadowVertexShaderSource, shadowFragmentShaderSource);
        shadowAttributePosition = gl.getAttribLocation(shadowProgram, 'aPosition');
        shadowModelUniform = gl.getUniformLocation(shadowProgram, 'uModel');
        shadowLightViewProjectionUniform = gl.getUniformLocation(shadowProgram, 'uLightViewProjection');
        if (shadowAttributePosition < 0 || !shadowModelUniform || !shadowLightViewProjectionUniform) {
          gl.deleteProgram(shadowProgram);
          shadowProgram = null;
        }
      } catch {
        shadowProgram = null;
      }
      gl.useProgram(program);
      attributeLocations = {
        position: gl.getAttribLocation(program, 'aPosition'),
        normal: gl.getAttribLocation(program, 'aNormal'),
        color: gl.getAttribLocation(program, 'aColor'),
      };
      const projection = gl.getUniformLocation(program, 'uProjection');
      const view = gl.getUniformLocation(program, 'uView');
      const model = gl.getUniformLocation(program, 'uModel');
      const light = gl.getUniformLocation(program, 'uLightPosition');
      const camera = gl.getUniformLocation(program, 'uCameraPosition');
      const tint = gl.getUniformLocation(program, 'uTint');
      const pointSize = gl.getUniformLocation(program, 'uPointSize');
      const lightViewProjection = gl.getUniformLocation(program, 'uLightViewProjection');
      const shadowMap = gl.getUniformLocation(program, 'uShadowMap');
      const environmentMap = gl.getUniformLocation(program, 'uEnvironmentMap');
      const shadowTexel = gl.getUniformLocation(program, 'uShadowTexel');
      const useShadowMap = gl.getUniformLocation(program, 'uUseShadowMap');
      if (!projection || !view || !model || !light || !camera || !tint || !pointSize || !lightViewProjection || !shadowMap || !environmentMap || !shadowTexel || !useShadowMap) {
        throw new Error('WebGL uniforms are unavailable');
      }
      uniformLocations = { projection, view, model, light, camera, tint, pointSize, lightViewProjection, shadowMap, environmentMap, shadowTexel, useShadowMap };

      portalOuter = createMesh(createTorus(1.72, 0.052, 72, 12));
      portalInner = createMesh(createTorus(1.35, 0.022, 64, 8));
      portalOrbit = createMesh(createTorus(2.12, 0.018, 72, 8));
      portalTilt = createMesh(createTorus(1.82, 0.026, 72, 8));
      vinylBody = createMesh(createCylinder(0.68, 0.058, 64));
      vinylGrooves = createMesh(mergeGeometry(
        [0.22, 0.29, 0.36, 0.43, 0.5, 0.57, 0.62].map((radius) => createTorus(radius, 0.0045, 48, 5)),
      ));
      vinylLabel = createMesh(createCylinder(0.145, 0.072, 36));
      headphoneBand = createMesh(createArcTube(0.64, 0.075, 48, 10));
      headphoneCup = createMesh(createCylinder(0.24, 0.22, 32));
      headphoneTrim = createMesh(createTorus(0.205, 0.028, 36, 8));
      crystal = createMesh(createOctahedron(0.42));
      sphere = createMesh(createSphere(0.4, 14, 20));
      islandTop = createMesh(createCylinder(0.66, 0.14, 36));
      islandBase = createMesh(createOctahedron(0.5));
      panel = createMesh(createBox(0.62, 0.42, 0.045));
      bar = createMesh(createBox(1, 1, 1));
      particles = createMesh(createParticles(), gl.POINTS);
      backdrop = createMesh(createBox(16, 10, 0.05));
      setWebglAvailable(true);
    } catch {
      meshes.forEach((mesh) => {
        gl.deleteBuffer(mesh.position);
        gl.deleteBuffer(mesh.normal);
        gl.deleteBuffer(mesh.color);
      });
      if (program) gl.deleteProgram(program);
      if (shadowProgram) gl.deleteProgram(shadowProgram);
      if (environmentTexture) gl.deleteTexture(environmentTexture);
      if (fallbackShadowTexture) gl.deleteTexture(fallbackShadowTexture);
      if (shadowTarget) {
        gl.deleteFramebuffer(shadowTarget.framebuffer);
        gl.deleteTexture(shadowTarget.texture);
        gl.deleteRenderbuffer(shadowTarget.depthBuffer);
      }
      setWebglAvailable(false);
      return;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.15 : 1.4);
      if (reduceMotion.matches) pixelRatio = Math.min(pixelRatio, 1);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      requestDraw();
    };

    const drawMesh = (mesh: GpuMesh, modelMatrix: Float32Array, color: number[], pointSize = 1) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position);
      gl.enableVertexAttribArray(attributeLocations.position);
      gl.vertexAttribPointer(attributeLocations.position, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normal);
      gl.enableVertexAttribArray(attributeLocations.normal);
      gl.vertexAttribPointer(attributeLocations.normal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.color);
      gl.enableVertexAttribArray(attributeLocations.color);
      gl.vertexAttribPointer(attributeLocations.color, 4, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(uniformLocations.model, false, modelMatrix);
      gl.uniform4fv(uniformLocations.tint, color);
      gl.uniform1f(uniformLocations.pointSize, pointSize);
      gl.drawArrays(mesh.mode, 0, mesh.vertexCount);
    };

    const compose = (
      x: number, y: number, z: number,
      rx: number, ry: number, rz: number,
      sx = 1, sy = 1, sz = 1,
    ) => {
      let model = translate(x, y, z);
      model = multiply(model, rotateZ(rz));
      model = multiply(model, rotateY(ry));
      model = multiply(model, rotateX(rx));
      return multiply(model, scale(sx, sy, sz));
    };

    const render = (timestamp: number) => {
      animationFrame = 0;
      if (disposed || contextLost || document.hidden || !isIntersecting) return;
      const shouldAnimate = activeRef.current && !reduceMotion.matches;
      if (shouldAnimate && timestamp - lastDraw < 33) {
        animationFrame = window.requestAnimationFrame(render);
        return;
      }
      if (!activeRef.current && timestamp - lastDraw < 80) {
        animationFrame = window.requestAnimationFrame(render);
        return;
      }
      lastDraw = timestamp;
      const time = shouldAnimate ? timestamp / 1000 : 0.35;
      pointerX += (targetPointerX - pointerX) * 0.035;
      pointerY += (targetPointerY - pointerY) * 0.035;
      const aspect = width / height;
      const cameraDistance = aspect < 0.8 ? 10.5 : aspect < 1.15 ? 9.2 : 8.25;
      const cameraPosition = [pointerX * 0.3, pointerY * 0.2, cameraDistance];
      const projectionMatrix = perspective((42 * Math.PI) / 180, aspect, 0.1, 40);
      const viewMatrix = lookAt(cameraPosition, [0, 0, 0], [0, 1, 0]);
      const emphasis = activeRef.current ? 1 : 0.46;
      const lightPosition = [-2.5 + Math.sin(time * 0.45) * 1.2, 3.2, 5.4];
      const lightView = lookAt(lightPosition, [0, 0, -0.15], [0, 1, 0]);
      const lightProjection = orthographic(-5.2, 5.2, -4.1, 4.1, 0.1, 18);
      const lightViewProjection = multiply(lightProjection, lightView);
      const commands: DrawCommand[] = [];
      const add = (mesh: GpuMesh, model: Float32Array, color: number[], pointSize?: number, castsShadow = true) => {
        commands.push({ mesh, model, color, pointSize, castsShadow });
      };

      // A dim receiver plane lets the geometry cast soft, real-time shadows into the environment.
      add(backdrop, compose(0, 0, -3.4, 0, 0, 0, 1, 1, 1), [0.16, 0.1, 0.24, 0.22 * emphasis], undefined, false);
      add(particles, multiply(rotateY(time * 0.018), rotateZ(time * 0.012)), [1, 1, 1, 0.5 * emphasis], 7 * pixelRatio, false);

      add(portalOuter, compose(0, 0.16, -0.15, 0.18, time * 0.09, 0, 1, 1, 1), [0.55, 0.27, 1, 0.68 * emphasis]);
      add(portalInner, compose(0, 0.16, -0.08, -0.12, -time * 0.075, time * 0.035), [0.32, 0.78, 1, 0.66 * emphasis]);
      add(portalOrbit, compose(0, 0.16, -0.28, 0.72, 0, time * 0.06), [0.83, 0.45, 1, 0.43 * emphasis]);
      add(portalTilt, compose(0, 0.16, -0.24, 1.18, time * 0.055, -0.3), [0.45, 0.79, 1, 0.42 * emphasis]);

      const recordPositions = [
        { x: -2.22, y: 0.98, phase: 0.25, scale: 0.88 },
        { x: 2.12, y: -0.62, phase: 2.1, scale: 0.76 },
      ];
      for (let recordIndex = 0; recordIndex < recordPositions.length; recordIndex++) {
        const record = recordPositions[recordIndex];
        const spin = time * (recordIndex === 0 ? 0.23 : -0.18) + record.phase;
        const recordModel = compose(record.x, record.y + Math.sin(time * 0.6 + record.phase) * 0.06, 0.5, 0.08, 0.12, spin, record.scale, record.scale, record.scale);
        add(vinylBody, recordModel, [0.08, 0.07, 0.14, 0.98 * emphasis]);
        add(vinylGrooves, multiply(recordModel, translate(0, 0, 0.032)), [0.49, 0.34, 0.72, 0.58 * emphasis]);
        add(vinylLabel, multiply(recordModel, translate(0, 0, 0.044)), [recordIndex === 0 ? 0.95 : 0.98, recordIndex === 0 ? 0.48 : 0.64, 0.72, 0.95 * emphasis]);
      }

      const headX = 1.55;
      const headY = -1.68 + Math.sin(time * 0.8) * 0.055;
      const headphoneRoot = compose(headX, headY, 0.6, 0.08, Math.sin(time * 0.35) * 0.11, -0.32, 0.78, 0.78, 0.78);
      add(headphoneBand, headphoneRoot, [0.55, 0.34, 0.89, 0.92 * emphasis]);
      for (const side of [-1, 1]) {
        const cupRoot = multiply(headphoneRoot, translate(side * 0.64, 0, 0));
        add(headphoneCup, cupRoot, [0.11, 0.09, 0.18, 1 * emphasis]);
        add(headphoneTrim, multiply(cupRoot, translate(0, 0, 0.12)), [0.41, 0.78, 0.9, 0.86 * emphasis]);
      }

      const sculptures = [
        { x: -2.78, y: -1.48, z: -0.35, phase: 0.4, size: 0.45 },
        { x: 2.7, y: 1.62, z: -0.5, phase: 2.2, size: 0.34 },
        { x: -0.52, y: 2.28, z: -0.6, phase: 1.3, size: 0.25 },
      ];
      sculptures.forEach((object, index) => {
        const objectModel = compose(
          object.x,
          object.y + Math.sin(time * 0.7 + object.phase) * 0.085,
          object.z,
          time * 0.13 + object.phase,
          time * 0.21 + object.phase,
          time * 0.09,
          object.size,
          object.size * (index === 1 ? 1.3 : 1),
          object.size,
        );
        add(index === 1 ? sphere : crystal, objectModel, index === 1 ? [0.29, 0.78, 0.92, 0.78 * emphasis] : [0.72, 0.44, 1, 0.82 * emphasis]);
      });

      for (let island = 0; island < 2; island++) {
        const side = island === 0 ? -1 : 1;
        const islandY = -2.37 + Math.sin(time * 0.55 + island) * 0.045;
        const islandRoot = compose(side * 1.8, islandY, -0.7, 0.14, time * (island ? -0.04 : 0.05), side * 0.1, 0.72, 0.72, 0.72);
        add(islandTop, islandRoot, [0.2, 0.15, 0.3, 0.84 * emphasis]);
        add(islandBase, multiply(islandRoot, translate(0, -0.39, 0)), [0.48, 0.31, 0.7, 0.75 * emphasis]);
      }

      const waveform = amplitudesRef.current;
      const barCount = Math.min(32, waveform.length);
      for (let index = 0; index < barCount; index++) {
        const normalizedIndex = barCount <= 1 ? 0 : index / (barCount - 1);
        const amplitude = Math.max(0.05, Math.min(1, waveform[index] || 0.08));
        const barHeight = 0.08 + amplitude * 0.42;
        const hueBlend = normalizedIndex;
        const model = compose(-1.05 + normalizedIndex * 2.1, -1.65, 0.28, 0, 0, 0, 0.023, barHeight, 0.026);
        add(bar, model, [0.66 - hueBlend * 0.26, 0.38 + hueBlend * 0.45, 0.98, 0.84 * emphasis]);
      }

      const glassPanelLeft = compose(-2.92, 0.1, -0.45, 0.05, 0.23, 0.12, 0.74, 0.74, 0.74);
      const glassPanelRight = compose(2.92, -0.18, -0.6, -0.12, -0.19, -0.1, 0.68, 0.68, 0.68);
      add(panel, glassPanelLeft, [0.43, 0.3, 0.75, 0.22 * emphasis], undefined, false);
      add(panel, glassPanelRight, [0.25, 0.69, 0.79, 0.2 * emphasis], undefined, false);

      const shadowTexture = shadowTarget?.texture || fallbackShadowTexture;
      if (shadowTarget && shadowProgram && shadowModelUniform && shadowLightViewProjectionUniform && shadowTexture) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowTarget.framebuffer);
        gl.viewport(0, 0, shadowTarget.size, shadowTarget.size);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);
        gl.useProgram(shadowProgram);
        gl.uniformMatrix4fv(shadowLightViewProjectionUniform, false, lightViewProjection);
        for (const command of commands) {
          if (!command.castsShadow || command.mesh.mode !== gl.TRIANGLES) continue;
          gl.bindBuffer(gl.ARRAY_BUFFER, command.mesh.position);
          gl.enableVertexAttribArray(shadowAttributePosition);
          gl.vertexAttribPointer(shadowAttributePosition, 3, gl.FLOAT, false, 0, 0);
          gl.uniformMatrix4fv(shadowModelUniform, false, command.model);
          gl.drawArrays(command.mesh.mode, 0, command.mesh.vertexCount);
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.uniformMatrix4fv(uniformLocations.projection, false, projectionMatrix);
      gl.uniformMatrix4fv(uniformLocations.view, false, viewMatrix);
      gl.uniformMatrix4fv(uniformLocations.lightViewProjection, false, lightViewProjection);
      gl.uniform3fv(uniformLocations.light, lightPosition);
      gl.uniform3fv(uniformLocations.camera, cameraPosition);
      gl.uniform2f(uniformLocations.shadowTexel, 1 / (shadowTarget?.size || 1), 1 / (shadowTarget?.size || 1));
      gl.uniform1f(uniformLocations.useShadowMap, shadowTarget && shadowProgram ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, environmentTexture);
      gl.uniform1i(uniformLocations.environmentMap, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
      gl.uniform1i(uniformLocations.shadowMap, 1);
      commands.forEach((command) => drawMesh(command.mesh, command.model, command.color, command.pointSize));

      if (shouldAnimate && !document.hidden && isIntersecting) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const requestDraw = () => {
      if (!animationFrame && !disposed && !contextLost && !document.hidden && isIntersecting) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };
    redrawRef.current = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      requestDraw();
    };

    const handlePointer = (event: PointerEvent) => {
      targetPointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      targetPointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * -2;
      if (!activeRef.current) {
        pointerX = targetPointerX;
        pointerY = targetPointerY;
      }
      requestDraw();
    };
    const handleVisibility = () => {
      if (document.hidden && animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else {
        requestDraw();
      }
    };
    const handleMotionPreference = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      resize();
      requestDraw();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      setWebglAvailable(false);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    const intersectionObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          isIntersecting = entry.isIntersecting;
          if (isIntersecting) requestDraw();
          else if (animationFrame) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
          }
        })
      : null;
    intersectionObserver?.observe(canvas);
    window.addEventListener('pointermove', handlePointer, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    reduceMotion.addEventListener('change', handleMotionPreference);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    resize();

    return () => {
      disposed = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      reduceMotion.removeEventListener('change', handleMotionPreference);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      redrawRef.current = null;
      meshes.forEach((mesh) => {
        gl.deleteBuffer(mesh.position);
        gl.deleteBuffer(mesh.normal);
        gl.deleteBuffer(mesh.color);
      });
      if (program) gl.deleteProgram(program);
      if (shadowProgram) gl.deleteProgram(shadowProgram);
      if (environmentTexture) gl.deleteTexture(environmentTexture);
      if (fallbackShadowTexture) gl.deleteTexture(fallbackShadowTexture);
      if (shadowTarget) {
        gl.deleteFramebuffer(shadowTarget.framebuffer);
        gl.deleteTexture(shadowTarget.texture);
        gl.deleteRenderbuffer(shadowTarget.depthBuffer);
      }
    };
  }, []);

  return (
    <div
      className={`sv-universe-scene ${active ? 'sv-universe-scene--hero' : 'sv-universe-scene--ambient'}`}
      aria-hidden="true"
    >
      <div className="sv-universe-scene__fallback" />
      {webglAvailable && <canvas ref={canvasRef} className="sv-universe-scene__canvas" tabIndex={-1} />}
    </div>
  );
};
