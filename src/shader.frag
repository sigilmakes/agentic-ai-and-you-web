precision highp float;
uniform vec2 iResolution;
uniform float iTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

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
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float t = iTime * 0.08;

  // dusty, sun-bleached palette
  vec3 color = vec3(0.18, 0.13, 0.09);

  // huge, slow-moving sand/dust currents
  vec2 p1 = uv * 1.2 + vec2(t * 0.25, t * 0.12);
  float n1 = fbm(p1);

  vec2 p2 = uv * 2.4 - vec2(t * 0.18, t * 0.22) + 3.1;
  float n2 = fbm(p2);

  vec2 p3 = uv * 4.0 + vec2(t * 0.10, -t * 0.15) + 6.4;
  float n3 = fbm(p3);

  // layered haze
  float haze1 = smoothstep(0.22, 0.78, n1) * 0.42;
  color += vec3(0.62, 0.42, 0.24) * haze1;

  float haze2 = smoothstep(0.32, 0.68, n2) * 0.26;
  color += vec3(0.46, 0.32, 0.18) * haze2;

  float haze3 = smoothstep(0.40, 0.60, n3) * 0.14;
  color += vec3(0.72, 0.52, 0.30) * haze3;

  // subtle hot-sun bloom drifting from upper right
  vec2 sun = vec2(0.72 + sin(t * 0.35) * 0.06, 0.28 + cos(t * 0.27) * 0.04);
  float sunDist = length((uv - sun) * vec2(1.0, 1.6));
  float bloom = exp(-sunDist * 2.8) * 0.18;
  color += vec3(1.0, 0.62, 0.30) * bloom;

  // fine dust grain
  color += (hash(uv * iResolution.xy + iTime) - 0.5) * 0.018;

  // heavy vignette like looking through a visor
  float vig = 1.0 - smoothstep(0.30, 0.95, length((uv - 0.5) * 1.7));
  color *= 0.65 + 0.35 * vig;

  gl_FragColor = vec4(color, 1.0);
}
