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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float t = iTime * 0.05;

  // warm dark base, clearly visible
  vec3 color = vec3(0.14, 0.08, 0.045);

  // three drifting fbm layers
  float n1 = fbm(uv * 1.0 + vec2(t * 0.12, -t * 0.07));
  float n2 = fbm(uv * 1.8 - vec2(t * 0.10, t * 0.13) + 3.7);
  float n3 = fbm(uv * 2.8 + vec2(t * 0.07, t * 0.11) + 7.2);

  // broad amber wash
  float wash1 = smoothstep(0.25, 0.75, n1);
  color += vec3(0.78, 0.40, 0.18) * wash1 * 0.35;

  // teal mist
  float wash2 = smoothstep(0.30, 0.70, n2);
  color += vec3(0.12, 0.38, 0.40) * wash2 * 0.28;

  // subtle warm secondary drift
  float wash3 = smoothstep(0.35, 0.65, n3);
  color += vec3(0.62, 0.30, 0.14) * wash3 * 0.18;

  // gentle horizontal scanline pulse
  float scan = sin(uv.y * 40.0 + t * 1.2) * 0.5 + 0.5;
  color *= 0.88 + scan * 0.12;

  // soft vignette to keep the slide foreground clear
  float vig = 1.0 - smoothstep(0.35, 1.05, length((uv - 0.5) * 1.7));
  color *= 0.75 + 0.25 * vig;

  // fine grain
  color += (hash(uv * iResolution.xy + iTime) - 0.5) * 0.015;

  gl_FragColor = vec4(color, 1.0);
}
