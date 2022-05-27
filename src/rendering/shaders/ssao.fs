#version 300 es
precision highp float;

#define SSAO_SAMPLE_COUNT 32
#define RADIUS 0.5
#define BIAS 0.0625

uniform sampler2D uPosTex;
uniform sampler2D uNorTex;
uniform sampler2D uDepthTex;
uniform sampler2D uNoiseTex;

uniform mat4 uViewMat;
uniform mat4 uProjMat;
uniform vec3 uSamples[SSAO_SAMPLE_COUNT];

in vec2 fTex;

out float oColor;

void main() {
  vec2 noiseScale = vec2(textureSize(uPosTex, 0).xy) / 4.0;
  
  // Sample from buffers using direct access (no mipmap needed)
  vec4 texPos = textureLod(uPosTex, fTex, 0.0);
  vec4 texNor = textureLod(uNorTex, fTex, 0.0);
  vec4 texNoise = textureLod(uNoiseTex, fTex * noiseScale, 0.0);

  // Read values from samples
  vec3 fPos = texPos.xyz;
  vec3 fNor = texNor.xyz;
  vec3 fRndVec = texNoise.xyz;

  // Convert from World Space to View Space
  vec3 vsPos = (uViewMat * vec4(texPos.xyz, 1.0)).xyz;
  vec3 vsNor = mat3(uViewMat) * fNor;

  // Create TBN
  vec3 tangent = normalize(fRndVec - vsNor * dot(fRndVec, vsNor));
  vec3 bitangent = cross(vsNor, tangent);
  mat3 TBN = mat3(tangent, bitangent, vsNor);

  // Compute occlusion
  float occlusion = 0.0;
  for (int s = 0; s < SSAO_SAMPLE_COUNT; ++s) {
    // Choose sample
    vec3 samplingPos = TBN * uSamples[s];
    samplingPos = vsPos + samplingPos * RADIUS;

    // Project sample using the Projection Matrix
    vec4 offset = vec4(samplingPos, 1.0);
    offset = uProjMat * offset;
    offset.xyz /= offset.w;
    offset.xyz = offset.xyz * 0.5 + 0.5;

    // Sample fragment
    vec3 position = texture(uPosTex, offset.xy).xyz;

    // Convert from World Space to View Space
    float depth = (uViewMat * vec4(position, 1.0)).z;

    // Smooth edges
    float rangeCheck = smoothstep(0.0, 1.0, RADIUS / abs(vsPos.z - depth));

    // Compute occlusion term for sample
    occlusion += ((depth >= samplingPos.z + BIAS) ? 1.0 : 0.0) * rangeCheck;
  }

  // Average occlusion with sample count
  occlusion = 1.0 - occlusion / float(SSAO_SAMPLE_COUNT);

  // Increase occlusion strength
  oColor = clamp(pow(occlusion, 1.0), 0.0, 1.0);
}