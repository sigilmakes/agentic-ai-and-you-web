precision highp float;
uniform vec2 iResolution;
uniform float iTime;

// pseudo-random unit gradients for classic Perlin noise
vec2 perlinHash2(vec2 p) {
  float n = fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  vec2 g = fract(vec2(n * 256.0, n * 65536.0)) * 2.0 - 1.0;
  return g / (length(g) + 0.001);
}

// classic 2D Perlin noise, output 0..1
float perlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  vec2 g00 = perlinHash2(i + vec2(0.0, 0.0));
  vec2 g10 = perlinHash2(i + vec2(1.0, 0.0));
  vec2 g01 = perlinHash2(i + vec2(0.0, 1.0));
  vec2 g11 = perlinHash2(i + vec2(1.0, 1.0));

  float d00 = dot(g00, f - vec2(0.0, 0.0));
  float d10 = dot(g10, f - vec2(1.0, 0.0));
  float d01 = dot(g01, f - vec2(0.0, 1.0));
  float d11 = dot(g11, f - vec2(1.0, 1.0));

  return mix(mix(d00, d10, f.x), mix(d01, d11, f.x), f.y) * 0.5 + 0.5;
}

// layered fractal Perlin noise
float fbmPerlin(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * perlin(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

mat2 rotate(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// smooth, meandering drift vector: each layer gets its own chaotic path
vec2 meander(vec2 p, float t, float seed) {
  float s = seed * 7.3;
  float x = fbmPerlin(p * 0.6 + vec2(t * 0.09 + s, s));
  float y = fbmPerlin(p * 0.6 + vec2(s + 3.0, t * 0.11 + s));
  return (vec2(x, y) * 2.0 - 1.0);
}

// a single slow, warped blob field
float blobField(vec2 uv, float t, float seed, float scale) {
  float angle = (fbmPerlin(vec2(t * 0.03, seed)) - 0.5) * 6.28;
  vec2 p = rotate(angle) * uv * scale;
  vec2 drift = meander(uv * 0.9 + seed, t, seed);
  return fbmPerlin(p + drift * 1.8);
}

// simple pseudo-random
float rand(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// slow drifting warm ember particles
float embers(vec2 uv, float t) {
  float v = 0.0;
  for (int i = 0; i < 55; i++) {
    float fi = float(i);
    float speed = 0.03 + 0.05 * fract(fi * 0.37);
    float size = 0.004 + 0.007 * fract(fi * 0.71);

    float x = fract(fi * 0.13 + t * speed * 0.25 + sin(t * 0.06 + fi) * 0.10);
    float y = fract(fi * 0.29 - t * speed * 0.40 + cos(t * 0.05 + fi * 1.3) * 0.08);

    vec2 pos = vec2(x, y);
    vec2 wrap = abs(uv - pos);
    wrap = min(wrap, 1.0 - wrap);

    float d = length(wrap);
    float sparkle = 0.5 + 0.5 * sin(t * (1.2 + fract(fi * 0.53)) + fi);
    v += smoothstep(size * 5.0, size, d) * sparkle * 0.055;
  }
  return v;
}

// slow rotating light rays / god-rays
float godRays(vec2 uv, float t) {
  vec2 center = uv - 0.5;
  float angle = atan(center.y, center.x) + t * 0.08;
  float rays = sin(angle * 8.0 + t * 0.15) * 0.5 + 0.5;
  rays += sin(angle * 14.0 - t * 0.22) * 0.5 + 0.5;
  rays *= 0.5;
  float dist = length(center) * 1.6;
  float falloff = exp(-dist * 1.8);
  return smoothstep(0.35, 0.85, rays) * falloff * 0.18;
}

// subtle, slow aurora-like haze that drifts and folds
float aurora(vec2 uv, float t) {
  vec2 p = uv * vec2(2.8, 1.5);
  float drift = fbmPerlin(p * 0.6 + vec2(t * 0.08, t * 0.05)) * 2.5;
  float wave = sin(p.x * 1.8 + t * 0.22 + drift) * 0.5 + 0.5;
  float y = uv.y * 1.6 - 0.75 + sin(uv.x * 2.2 + t * 0.12) * 0.22 + cos(t * 0.18 + uv.x * 1.4) * 0.12;
  float band = smoothstep(0.52, 0.82, wave) * exp(-y * y * 3.2);
  return band * 0.24;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float t = iTime * 0.38;

  // base dark warm void
  vec3 color = vec3(0.20, 0.12, 0.07);

  // firm but not overwhelming global breathing pulse
  float breathe = 0.72 + 0.28 * sin(t * 0.95);

  // large warm amber blobs drifting on independent random paths
  float a = blobField(uv, t, 1.0, 1.6);
  float maskA = smoothstep(0.26, 0.74, a);
  color += vec3(0.84, 0.46, 0.19) * maskA * 0.75 * breathe;

  // cooler teal blobs, smaller and faster, wandering elsewhere
  float b = blobField(uv + vec2(3.7, -2.2), t * 0.90, 4.3, 2.4);
  float maskB = smoothstep(0.32, 0.68, b);
  color += vec3(0.48, 0.78, 0.74) * maskB * 0.34 * (0.78 + 0.35 * sin(t * 1.6));

  // deep rust/brown undercurrents
  float c = blobField(uv * 0.7 + vec2(-1.8, 2.4), t * 0.60, 7.1, 1.25);
  float maskC = smoothstep(0.24, 0.76, c);
  color += vec3(0.64, 0.28, 0.13) * maskC * 0.32 * breathe;

  // bright wandering highlight
  vec2 sunPos = vec2(
    0.5 + 0.42 * meander(vec2(t * 0.10), t * 0.5, 2.0).x,
    0.5 + 0.34 * meander(vec2(t * 0.08), t * 0.5, 5.0).y
  );
  float sunDist = length((uv - sunPos) * vec2(1.0, 1.5));
  float sunGlow = exp(-sunDist * 2.6) * (0.75 + 0.55 * sin(t * 1.4));
  color += vec3(1.0, 0.62, 0.30) * sunGlow * 0.34;

  // subtle color shift / chromatic drift
  color.r += 0.04 * sin(t * 0.6 + uv.y * 3.0);
  color.b += 0.03 * cos(t * 0.5 + uv.x * 2.5);

  // subtle drifting aurora haze
  float band = aurora(uv, t);
  color += vec3(0.62, 0.82, 0.72) * band;
  color += vec3(0.85, 0.45, 0.22) * band * 0.45;

  // vignette to keep focus on the slide
  float vig = 1.0 - smoothstep(0.33, 1.05, length((uv - 0.5) * 1.55));
  color *= 0.64 + 0.36 * vig;

  gl_FragColor = vec4(color, 1.0);
}
