#version 300 es

#define NUM_PL 4
#define NUM_SL 32
#define NUM_SHADOW_CASTER 32

#define IS_LIT_FLAG (1 << 0)

precision highp float;
precision highp int;
precision highp sampler2DArray;

struct Material {
  float shininess;
  float specular;
  bool isLit;
};

struct DLight {
  vec3 dir;
  vec3 col;

  float amb;
  float dif;
  float spe;
};

struct PLight {
  vec3 pos;
  vec3 col;

  float amb;
  float dif;
  float spe;
  
  // float con;
  float lin;
  float qua;
};

struct SLight {
    vec3 dir;
    vec3 pos;
    vec3 col;
  
    float amb;
    float dif;
    float spe;
  
    // float con;
    float lin;
    float qua;

    float cutOff;
    float outerCutOff;
};

uniform sampler2D uPosTex;
uniform sampler2D uColTex;
uniform sampler2D uNorTex;
uniform sampler2D uDepthTex;
uniform sampler2D uSSAOTex;

uniform int uUseDirLightForShadow;
uniform mat4 uDirLightMat;
uniform sampler2D uDirShadowTex;

uniform int uUseSpotLightForShadow;
uniform mat4 uSpotLightMat[NUM_SHADOW_CASTER];
uniform sampler2DArray uSpotShadowTexArr;

uniform vec3 uViewPos;
uniform DLight uDirectionalLight;
uniform PLight uPointLights[NUM_PL];
uniform SLight uSpotLights[NUM_SL];

vec3 CalcDirLight(DLight light, vec3 viewDir, vec3 normal, vec3 color, float occlusion, float invShadowF, Material material) {
  // Direction
  vec3 lightDir = normalize(-light.dir);

  // Diffusive factor
  float diff = max(dot(normal, lightDir), 0.0);

  // Specular factor
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);

  // Compute each component
  vec3 ambient = light.amb * light.col * color * occlusion;
  vec3 diffuse = light.dif * light.col * diff * color;
  vec3 specular = light.spe * light.col * spec * material.specular;

  // Result
  return ambient + invShadowF * (diffuse + specular);
}

vec3 CalcPointLight(PLight light, vec3 viewDir, vec3 position, vec3 normal, vec3 color, float occlusion, float invShadowF, Material material) {
  // Direction
  vec3 lightDir = normalize(light.pos - position);

  // Diffusive factor
  float diff = max(dot(normal, lightDir), 0.0);

  // Specular factor
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);

  // Attenuation (based on distance from light position)
  float dist = length(light.pos - position);
  float attenuation = 1.0 / (1.0 + light.lin * dist + light.qua * (dist * dist));

  // Compute each component
  vec3 ambient = light.amb * light.col * color * occlusion;
  vec3 diffuse = light.dif * light.col * diff * color;
  vec3 specular = light.spe * light.col * spec * material.specular;

  // Add attenuation
  ambient *= attenuation;
  diffuse *= attenuation;
  specular *= attenuation;

  // Result
  return ambient + invShadowF * (diffuse + specular);
}

vec3 CalcSpotLight(SLight light, vec3 viewDir, vec3 position, vec3 normal, vec3 color, float occlusion, float invShadowF, Material material) {
  // Direction
  vec3 lightDir = normalize(light.pos - position);

  // Diffusive factor
  float diff = max(dot(normal, lightDir), 0.0);

  // Specular factor
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);

  // Attenuation (based on distance from light position)
  float distance = length(light.pos - position);
  float attenuation = 1.0 / (1.0 + light.lin * distance + light.qua * (distance * distance));    

  // Cone (using cutOff and outerCutOff)
  float theta = dot(lightDir, normalize(-light.dir)); 
  float epsilon = light.cutOff - light.outerCutOff;
  float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);

  // Compute each component
  vec3 ambient = light.amb * light.col * color * occlusion;
  vec3 diffuse = light.dif * light.col * diff * color;
  vec3 specular = light.spe * light.col * spec * material.specular;

  // Add attenuation and intensity
  ambient *= attenuation * intensity;
  diffuse *= attenuation * intensity;
  specular *= attenuation * intensity;

  // Result
  return ambient + invShadowF * (diffuse + specular);
}

float CalcDirShadow(vec3 pos, vec3 normal, float bias) {
  // Normal offset
  // https://digitalrune.github.io/DigitalRune-Documentation/html/3f4d959e-9c98-4a97-8d85-7a73c26145d7.htm
  vec4 position = vec4(pos.xyz + normal * 32.0 * (1.0 / 8192.0), 1.0);

  // Find position in light space
  vec4 fPosInLightSpace = uDirLightMat * position;

  // Project to find xyz
  vec3 fPosInLightSpaceProjCoords = fPosInLightSpace.xyz / fPosInLightSpace.w;

  // Remap to [0, 1]
  fPosInLightSpaceProjCoords = fPosInLightSpaceProjCoords * 0.5 + 0.5;

  // Discard if too far
  if (fPosInLightSpaceProjCoords.z > 1.0) return 0.0;

  // Store current depth
  float currentDepth = fPosInLightSpaceProjCoords.z;

  // Retrieve depth of fragment inside
  float closestDepth = texture(uDirShadowTex, fPosInLightSpaceProjCoords.xy).r;

  // Compute shadow (simple vers)
  float tmp = (currentDepth - bias >= closestDepth)  ? 1.0 : 0.0;

  // // PCF (improving the edges)
  // float tmp = 0.0;
  // vec2 texelSize = 1.0 / vec2(textureSize(uDirShadowTex, 0));
  // for (int x = -1; x <= 1; ++x) {
  //   for (int y = -1; y <= 1; ++y) {
  //     float pcfDepth = texture(uDirShadowTex, fPosInLightSpaceProjCoords.xy + vec2(x, y) * texelSize).r;
  //     tmp += (currentDepth - bias >= pcfDepth) ? 1.0 : 0.0;
  //   }
  // }
  // tmp /= 9.0;
  
  // Return result
  return tmp;
}

float CalcSpotShadow(int index, vec3 pos, vec3 normal, float bias) {
  // Normal offset
  // https://digitalrune.github.io/DigitalRune-Documentation/html/3f4d959e-9c98-4a97-8d85-7a73c26145d7.htm
  vec4 position = vec4(pos.xyz + normal * 32.0 * (1.0 / 1024.0), 1.0);

  // Find position in light space
  vec4 fPosInLightSpace = uSpotLightMat[index] * position;

  // Project to find xyz
  vec3 fPosInLightSpaceProjCoords = fPosInLightSpace.xyz / fPosInLightSpace.w;

  // Remap to [0, 1]
  fPosInLightSpaceProjCoords = fPosInLightSpaceProjCoords * 0.5 + 0.5;

  // Discard if too far
  if (fPosInLightSpaceProjCoords.z > 1.0) return 0.0;

  // Discard if outside of screen
  // Could be done better with clamp_to_border and custom border (impossible in webgl2)
  if (fPosInLightSpaceProjCoords.x > 1.0 || fPosInLightSpaceProjCoords.x < 0.0
    || fPosInLightSpaceProjCoords.y > 1.0 || fPosInLightSpaceProjCoords.y < 0.0) {
    return 0.0;
  }

  // Store current depth
  float currentDepth = fPosInLightSpaceProjCoords.z;

  // Linearize depth
  const float far = 10.0, near = 0.1;
  currentDepth = (2.0 * near * far) / (far + near - currentDepth * (far - near));

  // Retrieve depth of fragment inside
  float closestDepth = textureLod(uSpotShadowTexArr, vec3(fPosInLightSpaceProjCoords.xy, index), 0.0).r;

  // Compute shadow (simple vers)
  float tmp = (currentDepth - bias >= closestDepth)  ? 1.0 : 0.0;

  // PCF (improving the edges)
  // float tmp = 0.0;
  // vec2 texelSize = 1.0 / vec3(textureSize(uSpotShadowTexArr, 0)).xy;
  // for (int x = -1; x <= 1; ++x) {
  //   for (int y = -1; y <= 1; ++y) {
  //     float pcfDepth = textureLod(uSpotShadowTexArr, vec3(fPosInLightSpaceProjCoords.xy + vec2(x, y) * texelSize, index), 0.0).r;
  //     tmp += (currentDepth - bias >= pcfDepth) ? 1.0 : 0.0;
  //   }
  // }
  // tmp /= 9.0;

  // Attenuate based on distance from light position
  float dist = min(length(fPosInLightSpace.xy), 1.0);
  tmp *= 1.0 - dist * dist;

  // Return result
  return tmp;
}

in vec2 fTex;
out vec4 oColor;

void main() {
  // Sample from buffers using direct access (no mipmap needed)
  vec4 texPos = textureLod(uPosTex, fTex, 0.0);
  vec4 texCol = textureLod(uColTex, fTex, 0.0);
  vec4 texNor = textureLod(uNorTex, fTex, 0.0);
  vec4 texDepth = textureLod(uDepthTex, fTex, 0.0);
  vec4 texSSAO = textureLod(uSSAOTex, fTex, 0.0);

  // Read values from samples
  vec3 fPos = texPos.xyz;
  vec3 fCol = texCol.rgb;
  vec3 fNor = texNor.xyz;
  float fDepth = texDepth.x;
  float fOcc = texSSAO.x;

  // Discard if nothing was drawn
  if (fDepth == 1.0) {
    oColor = vec4(fCol, 1.0);
    return;
  }

  // Load material
  Material material;
  material.shininess = texCol.a;
  material.specular = texNor.a;
  material.isLit = (int(texPos.a) & IS_LIT_FLAG) == IS_LIT_FLAG;

  // Store result
  vec3 result = vec3(0);

  // Do lightning calculation ONLY if material is lit
  if (material.isLit) {
    ////////////////////////////////////
    // Shadows: Dir Light
    ////////////////////////////////////
    float dirShadow = 0.0;
    if (uUseDirLightForShadow == 1) {
      dirShadow = CalcDirShadow(fPos, fNor, 0.0000);
    }

    ////////////////////////////////////
    // Shadows: Spot Light
    ////////////////////////////////////
    float spotShadow = 0.0;
    for (int i = 0; i < uUseSpotLightForShadow; ++i) {
      spotShadow += CalcSpotShadow(i, fPos, fNor, 0.000);
    }
    
    // Calculate shadow factor
    float invShadowF = 1.0 - min(dirShadow + spotShadow, 1.0);

    // View direction
    vec3 viewDir = normalize(uViewPos - fPos);

    ////////////////////////////////////
    // Directional Light
    ////////////////////////////////////
    result += CalcDirLight(uDirectionalLight, viewDir, fNor, fCol, fOcc, 1.0 - dirShadow, material);

    for (int p = 0; p < NUM_PL; ++p) {
      ////////////////////////////////////
      // Point Light
      ////////////////////////////////////
      result += CalcPointLight(uPointLights[p], viewDir, fPos, fNor, fCol, fOcc, invShadowF, material);
    }

    for (int s = 0; s < NUM_SL; ++s) {
      ////////////////////////////////////
      // Spot Light
      ////////////////////////////////////
      // float shadowF = CalcSpotShadow(s, fPos, fNor, 0.000);
      // result += CalcSpotLight(uSpotLights[s], viewDir, fPos, fNor, fCol, fOcc, 1.0 - shadowF, material);
      result += CalcSpotLight(uSpotLights[s], viewDir, fPos, fNor, fCol, fOcc, invShadowF, material);
    }
  }
  else {
    result = fCol;
  }

  oColor = vec4(result, 1.0);
}