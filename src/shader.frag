precision highp float;
uniform vec2 iResolution;
uniform float iTime;

#define PI 3.14159265359

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash1(float n) { return fract(sin(n) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec2 aspect = vec2(iResolution.x / iResolution.y, 1.0);
  // very slow time to keep the background atmospheric, not animated
  float t = iTime * 0.003;

  // warm dark base
  vec3 color = vec3(0.045, 0.028, 0.016);

  // extremely faint nebula planes drifting diagonally
  vec2 nUv = uv * vec2(2.8, 2.2) + vec2(t * 0.4, -t * 0.25);
  float neb = fbm(nUv);
  float neb2 = fbm(uv * 4.5 - vec2(t * 0.15, t * 0.35) + 13.7);
  float nebMix = smoothstep(0.25, 0.75, neb * 0.6 + neb2 * 0.4);
  color += vec3(0.91, 0.55, 0.30) * nebMix * 0.045;
  color += vec3(0.20, 0.48, 0.52) * (1.0 - nebMix) * 0.025;

  // sparse starfield with two layers
  vec2 starUv = uv * aspect;
  float scroll1 = iTime * 0.0012;
  float scroll2 = iTime * 0.0005;
  vec3 stars = vec3(0.0);

  // layer 1: small stars, sparser
  vec2 grid1 = vec2(72.0, 48.0) * aspect;
  vec2 cell1 = floor(starUv * grid1);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = cell1 + vec2(float(x), float(y));
      vec2 rnd = vec2(hash(neighbor), hash(neighbor + 1.0));
      if (rnd.x > 0.82) continue;
      vec2 starPos = neighbor / grid1 + vec2(hash(neighbor + 2.0), hash(neighbor + 3.0)) / grid1;
      vec2 delta = (starUv - starPos + vec2(scroll1, 0.0)) * iResolution.xy;
      float size = 0.25 + rnd.y * 0.45;
      float core = smoothstep(size, size * 0.2, length(delta));
      float flicker = 0.9 + 0.1 * sin(iTime * 0.25 + hash(neighbor + 4.0) * 6.28);
      float warm = hash(neighbor + 5.0);
      vec3 starColor = mix(vec3(1.0, 0.96, 0.84), vec3(1.0, 0.74, 0.42), warm * 0.45);
      stars += core * flicker * starColor * 0.55;
    }
  }

  // layer 2: larger rare stars, dimmer
  vec2 grid2 = vec2(24.0, 16.0) * aspect;
  vec2 cell2 = floor(starUv * grid2);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = cell2 + vec2(float(x), float(y));
      vec2 rnd = vec2(hash(neighbor * 1.7), hash(neighbor * 2.3 + 1.0));
      if (rnd.x > 0.68) continue;
      vec2 starPos = neighbor / grid2 + vec2(hash(neighbor + 7.0), hash(neighbor + 11.0)) / grid2;
      vec2 delta = (starUv - starPos + vec2(scroll2, 0.0)) * iResolution.xy;
      float size = 0.9 + rnd.y * 1.4;
      float d = length(delta);
      float core = smoothstep(size, size * 0.25, d);
      float halo = smoothstep(size * 3.5, size, d) * 0.22;
      float flicker = 0.86 + 0.14 * sin(iTime * 0.18 + hash(neighbor + 9.0) * 6.28);
      vec3 starColor = mix(vec3(1.0, 0.95, 0.80), vec3(1.0, 0.70, 0.38), rnd.y);
      stars += (core + halo) * flicker * starColor * 0.65;
    }
  }
  color += stars;

  // strong vignette so the edges stay dark and the slide pops
  float vig = 1.0 - smoothstep(0.35, 1.2, length((uv - 0.5) * 1.85));
  color *= 0.68 + 0.32 * vig;

  // very subtle warm film grain
  float grain = hash(uv * iResolution.xy + iTime) - 0.5;
  color += grain * 0.012;

  gl_FragColor = vec4(color, 1.0);
}
