precision highp float;
uniform vec2 iResolution;
uniform float iTime;

vec2 perlinHash2(vec2 p) {
  float n = fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  vec2 g = fract(vec2(n * 256.0, n * 65536.0)) * 2.0 - 1.0;
  return g / (length(g) + 0.001);
}

float perlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float d00 = dot(perlinHash2(i), f);
  float d10 = dot(perlinHash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float d01 = dot(perlinHash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d11 = dot(perlinHash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

  return mix(mix(d00, d10, u.x), mix(d01, d11, u.x), u.y) * 0.5 + 0.5;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * perlin(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amplitude *= 0.5;
  }
  return value / 0.96875;
}

// A sheet of airborne sand stretched along the wind direction. Time only
// advances in one direction: none of the layers reverse or pulse in place.
float sandVeil(vec2 p, float t, float scale, float speed, float seed) {
  // Each altitude has a slightly different crosswind, breaking up the rigid
  // parallel motion while preserving the storm's dominant direction.
  float slope = 0.11 + 0.035 * sin(seed * 1.91);
  vec2 windDir = normalize(vec2(1.0, slope));
  vec2 windNormal = vec2(-windDir.y, windDir.x);
  float along = dot(p, windDir);
  float across = dot(p, windNormal);

  // The sine changes velocity, not direction. Its derivative is always smaller
  // than the base speed, so the sand surges and lulls but never reverses.
  float travel = t * speed + 0.06 * sin(t * 0.23 + seed * 1.7);
  float bend = fbm(vec2(along * 0.45 - travel * 0.18,
                        across * 2.0 + seed));
  vec2 samplePoint = vec2(
    (along - travel + bend * 0.30) * scale,
    (across + (bend - 0.5) * 0.08) * scale * 8.0
  );

  float body = fbm(samplePoint + vec2(seed * 7.3, seed * 2.1));
  float detail = fbm(samplePoint * vec2(1.7, 2.4)
                   + vec2(-travel * 0.45, seed * 11.0));
  body = mix(body, detail, 0.28);

  return smoothstep(0.43, 0.73, body);
}

float duneNoise(float x, float seed) {
  return fbm(vec2(x, seed));
}

// Mineral-teal weather that slowly arrives across the whole storm, peaks, and
// recedes to amber again. One cycle lasts roughly seventy seconds.
float tealWeather(vec2 uv, float t) {
  float slow = t * 0.025;
  float fold = fbm(vec2(uv.x * 1.25 - slow * 0.25,
                        uv.y * 1.9 + slow * 0.08));
  float texture = 0.5 + 0.5 * sin(
      uv.x * 5.0 + uv.y * 2.2 + fold * 4.0 - slow);
  texture = 0.48 + 0.52 * smoothstep(0.12, 0.88, texture);

  // Keep a little more color in the sky and airborne dust than on the ground.
  float atmosphere = smoothstep(0.10, 0.46, uv.y);
  atmosphere *= 1.0 - 0.22 * smoothstep(0.84, 1.0, uv.y);

  float cycle = 0.5 + 0.5 * sin(t * 0.09);
  float presence = smoothstep(0.20, 0.86, cycle);
  return clamp(presence * atmosphere * texture, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = iTime;

  // Burnt sky, brightest at the dust-choked horizon.
  vec3 zenith = vec3(0.085, 0.045, 0.022);
  vec3 horizonColor = vec3(0.54, 0.285, 0.105);
  float horizonGlow = exp(-abs(uv.y - 0.38) * 2.8);
  vec3 color = mix(zenith, horizonColor, horizonGlow * 0.74);

  // Broad sheets first, then narrower streams moving faster in the foreground.
  // Different speeds prevent the storm from reading as one translated texture.
  float farVeil = sandVeil(p, t, 0.72, 0.055, 1.7);
  float midVeil = sandVeil(p + vec2(0.0, 0.07), t, 1.15, 0.095, 4.2);
  float nearVeil = sandVeil(p - vec2(0.0, 0.12), t, 1.85, 0.155, 8.6);

  float airborne = farVeil * 0.34 + midVeil * 0.32 + nearVeil * 0.20;
  float groundLift = 1.0 - smoothstep(0.15, 0.72, uv.y);
  airborne += nearVeil * groundLift * 0.26;

  vec3 rustDust = vec3(0.53, 0.245, 0.075);
  vec3 goldDust = vec3(0.93, 0.585, 0.245);
  float warmPhase = 0.92 + 0.08 * sin(t * 0.13 + uv.x * 1.9);
  color += rustDust * farVeil * 0.24;
  color += goldDust * midVeil * 0.28 * warmPhase;
  color += vec3(1.0, 0.70, 0.34) * nearVeil * groundLift * 0.25;

  // A few long, translucent wind lanes cut through the larger veils.
  vec2 windDir = normalize(vec2(1.0, 0.14));
  vec2 windNormal = vec2(-windDir.y, windDir.x);
  float along = dot(p, windDir);
  float across = dot(p, windNormal);
  float laneWarp = fbm(vec2(along * 0.55 - t * 0.045, across * 2.3));
  float lanes = fbm(vec2(along * 0.9 - t * 0.22,
                         across * 16.0 + laneWarp * 2.5));
  lanes = smoothstep(0.58, 0.78, lanes) * (0.35 + 0.65 * groundLift);
  color += vec3(0.92, 0.56, 0.22) * lanes * 0.22;

  // The entire atmosphere gradually turns mineral-teal and then clears, rather
  // than carrying a permanent colored band across the frame.
  float tealArrival = tealWeather(uv, t);
  float tealDust = tealArrival * (0.78 + 0.22 * farVeil);
  vec3 tealBody = vec3(0.075, 0.43, 0.41);
  vec3 tealLight = vec3(0.20, 0.68, 0.62);
  color = mix(color, tealBody, tealDust * 0.30);
  color += tealLight * tealDust * (0.09 + 0.08 * midVeil);

  // A hard sun seen through the storm, kept off-center behind the slide content.
  vec2 sunPosition = vec2(
    0.80 + 0.012 * sin(t * 0.07),
    0.67 + 0.008 * sin(t * 0.05 + 1.6)
  );
  vec2 sunDelta = (uv - sunPosition) * vec2(aspect, 1.0);
  float sunDistance = length(sunDelta);
  float sunDisc = 1.0 - smoothstep(0.020, 0.037, sunDistance);
  float sunHalo = exp(-sunDistance * 8.5) + exp(-sunDistance * 2.8) * 0.18;
  float sunOcclusion = 0.50 + 0.50 * (1.0 - midVeil);
  color += vec3(1.0, 0.70, 0.31) * sunHalo * 0.65 * sunOcclusion;
  color += vec3(1.0, 0.84, 0.56) * sunDisc * 0.75 * sunOcclusion;

  // Three dune silhouettes. Their motion is nearly imperceptible while airborne
  // sand moves above them, grounding the scene instead of making it all swim.
  float farHeight = 0.225
                  + 0.045 * sin(p.x * 2.2 + 1.0)
                  + 0.025 * sin(p.x * 4.7 - 0.4)
                  + 0.022 * (duneNoise(p.x * 1.2 + t * 0.004, 3.0) - 0.5);
  float farDune = 1.0 - smoothstep(farHeight, farHeight + 0.012, uv.y);
  float farCrest = exp(-abs(uv.y - farHeight) * 145.0);
  color = mix(color, vec3(0.31, 0.135, 0.047), farDune * 0.72);
  color += vec3(0.77, 0.37, 0.10) * farCrest * 0.14;

  float midHeight = 0.145
                  + 0.060 * sin(p.x * 1.55 - 1.4)
                  + 0.020 * sin(p.x * 3.8 + 0.8)
                  + 0.018 * (duneNoise(p.x * 0.9 - t * 0.003, 7.0) - 0.5);
  float midDune = 1.0 - smoothstep(midHeight, midHeight + 0.014, uv.y);
  float midCrest = exp(-abs(uv.y - midHeight) * 125.0);
  color = mix(color, vec3(0.205, 0.082, 0.030), midDune * 0.88);
  color += vec3(0.62, 0.275, 0.075) * midCrest * 0.13;

  float nearHeight = 0.055
                   + 0.035 * sin(p.x * 1.25 + 2.1)
                   + 0.012 * sin(p.x * 5.0);
  float nearDune = 1.0 - smoothstep(nearHeight, nearHeight + 0.012, uv.y);
  color = mix(color, vec3(0.105, 0.040, 0.018), nearDune);

  // Let airborne sand softly veil the dune edges.
  color += vec3(0.58, 0.27, 0.075) * airborne * groundLift * 0.10;

  // Slow chromatic weather: warm and cool tones pass across the frame without
  // changing the density or direction of the storm itself.
  color.r += 0.018 * sin(t * 0.14 + uv.y * 3.0);
  color.b += 0.014 * cos(t * 0.11 + uv.x * 2.5);

  // Keep the center legible, darken the far edges, and preserve warm highlights.
  float vignette = 1.0 - smoothstep(0.35, 0.98,
      length((uv - 0.5) * vec2(1.35, 1.10)));
  color *= 0.66 + 0.34 * vignette;
  color = pow(max(color, 0.0), vec3(0.92));

  gl_FragColor = vec4(color, 1.0);
}
