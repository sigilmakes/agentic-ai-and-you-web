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
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float t = iTime * 0.018;

  // very dark warm base
  vec3 color = vec3(0.045, 0.028, 0.016);

  // slow drifting aurora-like layers
  vec2 p1 = uv * 1.6 + vec2(t * 0.22, -t * 0.12);
  float n1 = fbm(p1);

  vec2 p2 = uv * 2.6 - vec2(t * 0.18, t * 0.28) + 4.3;
  float n2 = fbm(p2);

  vec2 p3 = uv * 3.6 + vec2(t * 0.08, t * 0.22) + 8.7;
  float n3 = fbm(p3);

  // low-contrast, muted colour washes
  float layer1 = smoothstep(0.32, 0.68, n1) * 0.07;
  float layer2 = smoothstep(0.38, 0.62, n2) * 0.045;
  float layer3 = smoothstep(0.42, 0.58, n3) * 0.025;

  color += vec3(0.78, 0.42, 0.22) * layer1;
  color += vec3(0.18, 0.40, 0.42) * layer2;
  color += vec3(0.60, 0.32, 0.18) * layer3;

  // very subtle horizontal film bands
  float bands = sin(uv.y * 38.0 + t * 0.5) * 0.5 + 0.5;
  color -= bands * 0.012;

  // soft vignette
  float vig = 1.0 - smoothstep(0.30, 1.0, length((uv - 0.5) * 1.8));
  color *= 0.72 + 0.28 * vig;

  // minimal grain
  color += (hash(uv * iResolution.xy + iTime) - 0.5) * 0.008;

  gl_FragColor = vec4(color, 1.0);
}
