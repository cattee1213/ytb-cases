import { MAX_INSTANCES, INSTANCE_STRIDE } from './drops'

const FULLSCREEN_VERTEX = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
  vUv = aPos * 0.5 + 0.5;
}`

const GRADE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uPhoto;
uniform vec2 uCover;
uniform vec2 uAnchor;

vec3 toLinear(vec3 color) { return pow(max(color, 0.0), vec3(2.2)); }
vec3 toSrgb(vec3 color) { return pow(max(color, 0.0), vec3(1.0 / 2.2)); }

void main() {
  vec2 imageUv = clamp((vUv - 0.5) * uCover + uAnchor, 0.0, 1.0);
  vec3 color = toLinear(texture(uPhoto, imageUv).rgb);
  color *= 0.88;
  color.r *= 0.885;
  color.b *= 1.144;
  color.g *= 0.994;
  color = (color - 0.5) * 1.12 + 0.5;
  float luma = dot(max(color, 0.0), vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, 0.36);
  float shadow = smoothstep(0.62, 0.02, luma);
  float highlight = smoothstep(0.48, 1.05, luma);
  vec3 shadowTint = vec3(0.557, 0.643, 0.733);
  vec3 highlightTint = vec3(0.773, 0.816, 0.863);
  color = mix(color, color * shadowTint, shadow * 0.78);
  color = mix(color, color * highlightTint, highlight * 0.55);
  color = max(color, 0.0);
  color += shadowTint * (1.0 - smoothstep(0.0, 0.28, luma)) * 0.018;
  vec3 fogColor = mix(vec3(0.45, 0.51, 0.58), vec3(luma), 0.22);
  float cloudBase = exp(-pow((imageUv.y - 0.46) * 3.4, 2.0));
  float distanceMist = mix(0.35, 1.0, smoothstep(0.05, 0.82, imageUv.y));
  color = mix(color, fogColor, 0.4 * (0.34 * distanceMist + cloudBase * 0.42));
  outColor = vec4(toSrgb(clamp(color, 0.0, 1.0)), 1.0);
}`

const BLUR_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uDirection;
void main() {
  vec3 color = texture(uTex, vUv).rgb * 0.227027;
  color += texture(uTex, vUv + uDirection * 1.384615).rgb * 0.316216;
  color += texture(uTex, vUv - uDirection * 1.384615).rgb * 0.316216;
  color += texture(uTex, vUv + uDirection * 3.230769).rgb * 0.070270;
  color += texture(uTex, vUv - uDirection * 3.230769).rgb * 0.070270;
  outColor = vec4(color, 1.0);
}`

const DROP_VERTEX = `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 iCenter;
layout(location = 2) in vec2 iRadius;
layout(location = 3) in float iAngle;
layout(location = 4) in float iHeight;
layout(location = 5) in float iShape;
uniform vec2 uResolution;
out vec2 vLocal;
out float vHeight;
out float vShape;
void main() {
  float cosAngle = cos(iAngle);
  float sinAngle = sin(iAngle);
  vec2 scaled = vec2(aCorner.x * iRadius.x, aCorner.y * iRadius.y);
  vec2 rotated = vec2(
    cosAngle * scaled.x - sinAngle * scaled.y,
    sinAngle * scaled.x + cosAngle * scaled.y
  );
  vec2 pixel = iCenter + rotated;
  vec2 clip = pixel / uResolution * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  vLocal = aCorner;
  vHeight = iHeight;
  vShape = iShape;
}`

const DROP_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vLocal;
in float vHeight;
in float vShape;
out vec4 outColor;
void main() {
  if (vShape < 0.5) {
    float down = vLocal.y;
    float flare = mix(0.84, 1.0, smoothstep(-0.2, 0.8, down));
    vec2 p = vec2(vLocal.x / flare, (down - 0.08) / 0.94);
    float dist2 = dot(p, p);
    if (dist2 > 1.0) discard;
    float dome = pow(max(0.0, 1.0 - dist2), 1.05);
    float height = dome * smoothstep(1.0, 0.9, dist2) * vHeight;
    float arc = smoothstep(0.11, 0.0, abs(length(p - vec2(0.02, -0.08)) - 0.78));
    float upper = smoothstep(0.25, -0.45, p.y);
    float spark = arc * upper * smoothstep(0.28, 0.55, vHeight) * 0.42;
    float ring = smoothstep(0.9, 1.0, length(p));
    outColor = vec4(height, spark, ring, 1.0);
    return;
  }
  float body = exp(-vLocal.x * vLocal.x * 3.4) * smoothstep(1.0, 0.62, abs(vLocal.x));
  float fade = smoothstep(-1.0, 0.2, vLocal.y);
  float height = body * fade * vHeight;
  if (height < 0.015) discard;
  outColor = vec4(height, 0.0, 0.0, 1.0);
}`

const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uSharp;
uniform sampler2D uBlurNear;
uniform sampler2D uBlurFar;
uniform sampler2D uDrops;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform float uTime;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float height = texture(uDrops, vUv).r;
  float left = texture(uDrops, vUv - vec2(uTexel.x, 0.0)).r;
  float right = texture(uDrops, vUv + vec2(uTexel.x, 0.0)).r;
  float down = texture(uDrops, vUv - vec2(0.0, uTexel.y)).r;
  float up = texture(uDrops, vUv + vec2(0.0, uTexel.y)).r;
  vec2 gradient = vec2(right - left, up - down);
  float slope = length(gradient);
  vec2 refractUv = clamp(vUv + gradient * (8.0 + height * 26.0), 0.0, 1.0);
  vec4 dropSample = texture(uDrops, vUv);

  vec3 sharp = texture(uSharp, vUv).rgb;
  vec3 lensSharp = texture(uSharp, refractUv).rgb;
  vec3 nearColor = texture(uBlurNear, refractUv).rgb;
  vec3 farColor = texture(uBlurFar, refractUv).rgb;
  float focus = smoothstep(0.12, 0.38, height);
  vec3 wet = mix(nearColor, farColor, smoothstep(0.2, 0.55, height));
  vec3 lens = mix(lensSharp, wet, focus);
  vec3 dry = mix(sharp, texture(uBlurNear, vUv).rgb, 0.03);
  vec3 color = mix(dry, lens, smoothstep(0.015, 0.08, height));
  color *= 1.0 - dropSample.b * smoothstep(0.05, 0.2, height) * 0.55;
  color += dropSample.g * vec3(0.93, 0.96, 1.0);
  float fres = pow(clamp(slope * 3.2, 0.0, 1.0), 2.0) * smoothstep(0.12, 0.34, height);
  color += fres * vec3(0.75, 0.82, 0.9) * 0.12;

  vec2 centered = (vUv - 0.5) * vec2(0.9, 1.02);
  color *= 1.0 - smoothstep(0.42, 1.2, length(centered)) * 0.62;
  float grain = hash(vUv * uResolution + fract(uTime * 0.37) * vec2(19.0, 47.0)) - 0.5;
  color += grain * 0.02;
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`

interface Target {
  texture: WebGLTexture
  framebuffer: WebGLFramebuffer
  width: number
  height: number
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'shader compile failed'
    gl.deleteShader(shader)
    throw new Error(log)
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string, uniformNames: string[]) {
  const program = gl.createProgram()
  if (!program) throw new Error('Unable to create program')
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'program link failed'
    gl.deleteProgram(program)
    throw new Error(log)
  }
  const uniforms: Record<string, WebGLUniformLocation> = {}
  for (const name of uniformNames) {
    const location = gl.getUniformLocation(program, name)
    if (!location) throw new Error(`Missing uniform ${name}`)
    uniforms[name] = location
  }
  return { program, uniforms }
}

function makeTarget(gl: WebGL2RenderingContext, width: number, height: number): Target {
  const texture = gl.createTexture()
  const framebuffer = gl.createFramebuffer()
  if (!texture || !framebuffer) throw new Error('Unable to create framebuffer')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Framebuffer incomplete')
  }
  return { texture, framebuffer, width, height }
}

function destroyTarget(gl: WebGL2RenderingContext, target: Target | null) {
  if (!target) return
  gl.deleteFramebuffer(target.framebuffer)
  gl.deleteTexture(target.texture)
}

function coverPlacement(screenWidth: number, screenHeight: number, imageWidth: number, imageHeight: number) {
  const screenAspect = screenWidth / Math.max(1, screenHeight)
  const imageAspect = imageWidth / Math.max(1, imageHeight)
  let scaleX = 1
  let scaleY = 1
  let anchorY = 0.5
  if (screenAspect > imageAspect) {
    scaleY = imageAspect / screenAspect
    anchorY = 0.58
  } else {
    scaleX = screenAspect / imageAspect
  }
  const halfY = scaleY * 0.5
  const halfX = scaleX * 0.5
  anchorY = Math.min(1 - halfY, Math.max(halfY, anchorY))
  const anchorX = Math.min(1 - halfX, Math.max(halfX, 0.5))
  return { scaleX, scaleY, anchorX, anchorY }
}

function viewSize(cssWidth: number, cssHeight: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let width = Math.max(1, Math.round(cssWidth * dpr))
  let height = Math.max(1, Math.round(cssHeight * dpr))
  const longest = Math.max(width, height)
  if (longest > 1920) {
    const scale = 1920 / longest
    width = Math.max(1, Math.round(width * scale))
    height = Math.max(1, Math.round(height * scale))
  }
  return { width, height }
}

export interface Renderer {
  resize(cssWidth: number, cssHeight: number): { width: number; height: number }
  setPhoto(image: HTMLImageElement): void
  draw(instances: Float32Array, count: number, time: number): void
  destroy(): void
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  })
  if (!gl) throw new Error('WebGL2 is not available')

  const gradeProgram = createProgram(gl, FULLSCREEN_VERTEX, GRADE_FRAGMENT, ['uPhoto', 'uCover', 'uAnchor'])
  const blurProgram = createProgram(gl, FULLSCREEN_VERTEX, BLUR_FRAGMENT, ['uTex', 'uDirection'])
  const dropProgram = createProgram(gl, DROP_VERTEX, DROP_FRAGMENT, ['uResolution'])
  const compositeProgram = createProgram(gl, FULLSCREEN_VERTEX, COMPOSITE_FRAGMENT, [
    'uSharp',
    'uBlurNear',
    'uBlurFar',
    'uDrops',
    'uTexel',
    'uResolution',
    'uTime',
  ])

  const triangle = gl.createBuffer()
  const quad = gl.createBuffer()
  const instances = gl.createBuffer()
  const screenVao = gl.createVertexArray()
  const dropVao = gl.createVertexArray()
  const photo = gl.createTexture()
  if (!triangle || !quad || !instances || !screenVao || !dropVao || !photo) {
    throw new Error('Unable to allocate WebGL buffers')
  }

  gl.bindVertexArray(screenVao)
  gl.bindBuffer(gl.ARRAY_BUFFER, triangle)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  gl.bindVertexArray(dropVao)
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(0, 0)
  gl.bindBuffer(gl.ARRAY_BUFFER, instances)
  gl.bufferData(gl.ARRAY_BUFFER, MAX_INSTANCES * INSTANCE_STRIDE * 4, gl.DYNAMIC_DRAW)
  const stride = INSTANCE_STRIDE * 4
  const attrib = (location: number, size: number, offset: number) => {
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset)
    gl.vertexAttribDivisor(location, 1)
  }
  attrib(1, 2, 0)
  attrib(2, 2, 8)
  attrib(3, 1, 16)
  attrib(4, 1, 20)
  attrib(5, 1, 24)
  gl.bindVertexArray(null)

  let bufferWidth = 1
  let bufferHeight = 1
  let imageWidth = 1
  let imageHeight = 1
  let sharp: Target | null = null
  let ping: Target | null = null
  let near: Target | null = null
  let far: Target | null = null
  let drops: Target | null = null
  let photoReady = false
  let errorChecks = 0

  const rebuildTargets = () => {
    destroyTarget(gl, sharp)
    destroyTarget(gl, ping)
    destroyTarget(gl, near)
    destroyTarget(gl, far)
    destroyTarget(gl, drops)
    sharp = makeTarget(gl, bufferWidth, bufferHeight)
    ping = makeTarget(gl, bufferWidth, bufferHeight)
    near = makeTarget(gl, bufferWidth, bufferHeight)
    far = makeTarget(gl, bufferWidth, bufferHeight)
    drops = makeTarget(gl, bufferWidth, bufferHeight)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  const blur = (source: Target, dest: Target, radiusX: number, radiusY: number) => {
    if (!ping) return
    gl.bindFramebuffer(gl.FRAMEBUFFER, ping.framebuffer)
    gl.useProgram(blurProgram.program)
    gl.bindVertexArray(screenVao)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, source.texture)
    gl.uniform1i(blurProgram.uniforms.uTex ?? null, 0)
    gl.uniform2f(blurProgram.uniforms.uDirection ?? null, radiusX / bufferWidth, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, dest.framebuffer)
    gl.bindTexture(gl.TEXTURE_2D, ping.texture)
    gl.uniform2f(blurProgram.uniforms.uDirection ?? null, 0, radiusY / bufferHeight)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  return {
    resize(cssWidth: number, cssHeight: number) {
      const next = viewSize(cssWidth, cssHeight)
      if (next.width !== bufferWidth || next.height !== bufferHeight || !sharp) {
        bufferWidth = next.width
        bufferHeight = next.height
        canvas.width = bufferWidth
        canvas.height = bufferHeight
        rebuildTargets()
      }
      return { width: bufferWidth, height: bufferHeight }
    },
    setPhoto(image: HTMLImageElement) {
      imageWidth = image.naturalWidth || image.width
      imageHeight = image.naturalHeight || image.height
      gl.bindTexture(gl.TEXTURE_2D, photo)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      photoReady = true
    },
    draw(batch: Float32Array, count: number, time: number) {
      if (!photoReady || !sharp || !near || !far || !drops) return
      gl.viewport(0, 0, bufferWidth, bufferHeight)
      gl.disable(gl.BLEND)
      gl.disable(gl.DEPTH_TEST)

      const placement = coverPlacement(bufferWidth, bufferHeight, imageWidth, imageHeight)
      gl.bindFramebuffer(gl.FRAMEBUFFER, sharp.framebuffer)
      gl.useProgram(gradeProgram.program)
      gl.bindVertexArray(screenVao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, photo)
      gl.uniform1i(gradeProgram.uniforms.uPhoto ?? null, 0)
      gl.uniform2f(gradeProgram.uniforms.uCover ?? null, placement.scaleX, placement.scaleY)
      gl.uniform2f(gradeProgram.uniforms.uAnchor ?? null, placement.anchorX, placement.anchorY)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      blur(sharp, near, 1.35, 1.35)
      blur(near, far, 7.5, 7.5)

      gl.bindFramebuffer(gl.FRAMEBUFFER, drops.framebuffer)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (count > 0) {
        gl.enable(gl.BLEND)
        gl.blendEquation(gl.MAX)
        gl.blendFunc(gl.ONE, gl.ONE)
        gl.useProgram(dropProgram.program)
        gl.uniform2f(dropProgram.uniforms.uResolution ?? null, bufferWidth, bufferHeight)
        gl.bindVertexArray(dropVao)
        gl.bindBuffer(gl.ARRAY_BUFFER, instances)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, batch.subarray(0, count * 8))
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
        gl.disable(gl.BLEND)
        gl.blendEquation(gl.FUNC_ADD)
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.useProgram(compositeProgram.program)
      gl.bindVertexArray(screenVao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, sharp.texture)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, near.texture)
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, far.texture)
      gl.activeTexture(gl.TEXTURE3)
      gl.bindTexture(gl.TEXTURE_2D, drops.texture)
      gl.uniform1i(compositeProgram.uniforms.uSharp ?? null, 0)
      gl.uniform1i(compositeProgram.uniforms.uBlurNear ?? null, 1)
      gl.uniform1i(compositeProgram.uniforms.uBlurFar ?? null, 2)
      gl.uniform1i(compositeProgram.uniforms.uDrops ?? null, 3)
      gl.uniform2f(compositeProgram.uniforms.uTexel ?? null, 1 / bufferWidth, 1 / bufferHeight)
      gl.uniform2f(compositeProgram.uniforms.uResolution ?? null, bufferWidth, bufferHeight)
      gl.uniform1f(compositeProgram.uniforms.uTime ?? null, time)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (errorChecks < 2) {
        errorChecks += 1
        const error = gl.getError()
        if (error !== gl.NO_ERROR) console.error('WebGL error', error)
      }
    },
    destroy() {
      destroyTarget(gl, sharp)
      destroyTarget(gl, ping)
      destroyTarget(gl, near)
      destroyTarget(gl, far)
      destroyTarget(gl, drops)
      gl.deleteTexture(photo)
      gl.deleteBuffer(triangle)
      gl.deleteBuffer(quad)
      gl.deleteBuffer(instances)
      gl.deleteVertexArray(screenVao)
      gl.deleteVertexArray(dropVao)
      gl.deleteProgram(gradeProgram.program)
      gl.deleteProgram(blurProgram.program)
      gl.deleteProgram(dropProgram.program)
      gl.deleteProgram(compositeProgram.program)
    },
  }
}
