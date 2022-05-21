import { Program, Shader } from "webgl-basic-lib";

import DeferredFS from '!raw-loader!./shaders/deferred.fs';

export function CreateProgramFromData(gl, dataGen) {
  const data = dataGen(gl);
  const program = new Program(gl);
  program.attachShader(new Shader(gl, gl.VERTEX_SHADER, data.vertex_shader_src));
  program.attachShader(new Shader(gl, gl.FRAGMENT_SHADER, data.fragment_shader_src));
  program.attributes(data.attributes);
  program.link();
  program.declareUniforms(data.uniforms);
  return program;
}

export const SSAO_SAMPLE_COUNT = 32;
export const NUM_SHADOW_CASTER = 32;
export const NUM_PL = 4;
export const NUM_SL = 32;
export const HIGH_SHADOW_SIZE = 4096;
export const SMALL_SHADOW_SIZE = 512;

export const SHADERS = {

  DEFAULT: (gl) => ({
    vertex_shader_src: `#version 300 es
    layout (location = 0) in vec3 vPos;
    layout (location = 1) in vec2 vTex;
    layout (location = 2) in vec3 vNor;

    uniform mat4 uModel;
    uniform mat4 uViewProj;

    out vec3 fPos;
    out vec2 fTex;
    out vec3 fNor;

    void main() {
      vec4 worldPos = uModel * vec4(vPos, 1.0);
      fPos = worldPos.xyz;
      fTex = vTex;
      fNor = transpose(inverse(mat3(uModel))) * vNor;
      gl_Position = uViewProj * worldPos;
    }
    `,

    fragment_shader_src: `#version 300 es
    precision highp float;

    struct Material {
      float shininess;
    };

    in vec3 fPos;
    in vec2 fTex;
    in vec3 fNor;

    uniform Material uMaterial;
    uniform sampler2D uTexture;

    layout (location = 0) out vec4 oCol;
    layout (location = 1) out vec4 oPos;
    layout (location = 2) out vec4 oNor;

    void main() {
      vec3 col = texture(uTexture, fTex).rgb;
      oCol = vec4(col, uMaterial.shininess);
      oPos = vec4(fPos, 1.0);
      oNor = vec4(normalize(fNor), 1.0);
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
      ["vTex", 2, gl.FLOAT, 32, 12],
      ["vNor", 3, gl.FLOAT, 32, 20],
    ],

    uniforms: [
      ["uModel", "Matrix4fv"],
      ["uViewProj", "Matrix4fv"],
      ["uTexture", "1i"],
      ["uMaterial.shininess", "1f"],
    ],
  }),

  COLORED: (gl) => ({
    vertex_shader_src: `#version 300 es
    layout (location = 0) in vec3 vPos;
    uniform mat4 uMatrix;
    void main() {
      gl_Position = uMatrix * vec4(vPos, 1.0);
    }
    `,

    fragment_shader_src: `#version 300 es
    precision highp float;
    uniform vec4 uColor;
    out vec4 oCol;
    void main() {
      oCol = uColor;
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
    ],

    uniforms: [
      ["uMatrix", "Matrix4fv"],
      ["uColor", "4fv"],
    ],
  }),

  TEXTURED: (gl) => ({
    vertex_shader_src: `#version 300 es
    layout (location = 0) in vec3 vPos;
    layout (location = 1) in vec2 vTex;
    uniform mat4 uMatrix;
    out vec2 fTex;
    void main() {
      fTex = vTex;
      gl_Position = uMatrix * vec4(vPos, 1.0);
    }
    `,

    fragment_shader_src: `#version 300 es
    precision highp float;
    uniform sampler2D uTexture;
    in vec2 fTex;
    out vec4 oCol;
    void main() {
      oCol = texture(uTexture, fTex);
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
      ["vTex", 2, gl.FLOAT, 32, 12],
    ],

    uniforms: [
      ["uMatrix", "Matrix4fv"],
      ["uTexture", "1i"],
    ],
  }),

  DEBUG_DRAW: (gl) => ({
    vertex_shader_src: `#version 300 es
    layout (location = 0) in vec3 vPos;
    uniform mat4 uMatrix;
    uniform float uPointSize;
    void main() {
      gl_PointSize = uPointSize;
      gl_Position = uMatrix * vec4(vPos, 1.0);
    }
    `,

    fragment_shader_src: `#version 300 es
    precision highp float;
    uniform vec4 uColor;
    out vec4 oCol;
    void main() {
      oCol = uColor;
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
    ],

    uniforms: [
      ["uMatrix", "Matrix4fv"],
      ["uColor", "4fv"],
      ["uPointSize", "1f"],
    ],
  }),

  DEBUG_VIEW: (gl) => ({
    vertex_shader_src: `#version 300 es
    layout (location = 0) in vec3 vPos;
    layout (location = 1) in vec2 vTex;

    uniform mat4 uMatrix;

    out vec2 fTex;
    
    void main() {
      fTex = vTex;
      gl_Position = uMatrix * vec4(vPos, 1.0);
    }
    `,

    fragment_shader_src: `#version 300 es
    precision highp float;
    in vec2 fTex;

    uniform sampler2D uPosTex;
    uniform sampler2D uColTex;
    uniform sampler2D uNorTex;
    uniform sampler2D uDepthTex;

    out vec4 oColor;

    void main() {
      vec2 texCoord1 = vec2(fTex.x * 2.0, fTex.y * 2.0);
      vec2 texCoord2 = vec2((fTex.x - 0.5) * 2.0, fTex.y * 2.0);
      vec2 texCoord3 = vec2(fTex.x * 2.0, (fTex.y - 0.5) * 2.0);
      vec2 texCoord4 = vec2((fTex.x - 0.5) * 2.0, (fTex.y - 0.5) * 2.0);

      vec3 fNor = texture(uNorTex, texCoord1).xyz;
      float fDepth = texture(uDepthTex, texCoord2).x;
      vec3 fCol = texture(uColTex, texCoord3).rgb;
      vec3 fPos = texture(uPosTex, texCoord4).xyz;

      fDepth = pow(fDepth, 10.0);
      
      if (fTex.y > 0.5) {
        if (fTex.x < 0.5) {
          oColor = vec4(fCol, 1.0);
        } else {
          oColor = vec4(fPos, 1.0);
        }
      } else {
        if (fTex.x < 0.5) {
          oColor = vec4(fNor, 1.0);
        } else {
          oColor = vec4(vec3(fDepth), 1.0);
        }
      }
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
      ["vTex", 2, gl.FLOAT, 32, 12],
    ],

    uniforms: [
      ["uMatrix", "Matrix4fv"],
      ["uPosTex", "1i"],
      ["uColTex", "1i"],
      ["uNorTex", "1i"],
      ["uDepthTex", "1i"],
    ],
  }),

  SSAO: (gl) => ({
    vertex_shader_src: `#version 300 es
    layout (location = 0) in vec3 vPos;
    layout (location = 1) in vec2 vTex;

    uniform mat4 uMatrix;

    out vec2 fTex;

    void main() {
      fTex = vTex;
      gl_Position = uMatrix * vec4(vPos, 1.0);
    }
    `,

    fragment_shader_src: `#version 300 es
    precision highp float;

    uniform sampler2D uPosTex;
    uniform sampler2D uNorTex;
    uniform sampler2D uDepthTex;
    uniform sampler2D uNoiseTex;

    uniform mat4 uViewProj;
    uniform vec3 uSamples[${SSAO_SAMPLE_COUNT}];

    const vec2 noiseScale = vec2(800.0 / 4.0, 600.0 / 4.0);

    in vec2 fTex;

    out float oColor;

    void main() {
      vec4 texPos = texture(uPosTex, fTex);
      vec4 texNor = texture(uNorTex, fTex);
      vec4 texNoise = texture(uNoiseTex, fTex * noiseScale);

      vec3 fPos = texPos.xyz;
      vec3 fNor = texNor.xyz;
      vec3 fRndVec = texNoise.xyz;

      vec3 tangent = normalize(fRndVec - fNor * dot(fRndVec, fNor));
      vec3 bitangent = cross(fNor, tangent);
      mat3 TBN = mat3(tangent, bitangent, fNor);
      
      float radius = 0.5;
      float bias = 0.025;

      float occlusion = 0.0;

      for (int s = 0; s < ${SSAO_SAMPLE_COUNT}; ++s) {
        vec3 samplingPos = TBN * uSamples[s];
        samplingPos = fPos + samplingPos * radius;

        vec4 offset = vec4(samplingPos, 1.0);
        offset = uViewProj * offset;
        offset.xyz /= offset.w;
        offset.xyz = offset.xyz * 0.5 + 0.5;

        float depth = texture(uPosTex, offset.xy).z;
        float rangeCheck = smoothstep(0.0, 1.0, radius / abs(fPos.z - depth));
        occlusion += ((depth >= samplingPos.z + bias) ? 1.0 : 0.0) * rangeCheck;
      }

      occlusion = 1.0 - occlusion / float(${SSAO_SAMPLE_COUNT});

      oColor = occlusion;
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
      ["vTex", 2, gl.FLOAT, 32, 12],
    ],

    uniforms: [
      ["uMatrix", "Matrix4fv"],
      ["uViewProj", "Matrix4fv"],
      ["uPosTex", "1i"],
      ["uNorTex", "1i"],
      ["uDepthTex", "1i"],
      ["uNoiseTex", "1i"],

      ...new Array(SSAO_SAMPLE_COUNT).fill(null).map((_, ind) => ([
        ["uSamples[" + ind + "]", "3fv"],
      ]).flat()),
    ],
  }),

  SSAO_BLUR: (gl) => ({
    vertex_shader_src: `#version 300 es
    layout (location = 0) in vec3 vPos;
    layout (location = 1) in vec2 vTex;
    uniform mat4 uMatrix;
    out vec2 fTex;
    void main() {
      fTex = vTex;
      gl_Position = uMatrix * vec4(vPos, 1.0);
    }
    `,

    fragment_shader_src: `#version 300 es
    precision highp float;
    uniform sampler2D uTexture;
    in vec2 fTex;
    out float oCol;
    void main() {
      vec2 texelSize = 1.0 / vec2(textureSize(uTexture, 0));
      
      float result = 0.0;

      for (int x = -2; x < 2; ++x) {
        for (int y = -2; y < 2; ++y) {
          vec2 offset = vec2(float(x), float(y)) * texelSize;
          result += texture(uTexture, fTex + offset).r;
        }
      }

      oCol = result / (4.0 * 4.0);
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
      ["vTex", 2, gl.FLOAT, 32, 12],
    ],

    uniforms: [
      ["uMatrix", "Matrix4fv"],
      ["uTexture", "1i"],
    ],
  }),

  SHADOW_MAP_DL: (gl) => ({
    vertex_shader_src: `#version 300 es
    layout (location = 0) in vec3 vPos;
    uniform mat4 uLightMat;
    uniform mat4 uModel;
    out vec4 fPos;
    void main() {
      gl_Position = uLightMat * uModel * vec4(vPos, 1.0);
      fPos = gl_Position;
    }
    `,

    fragment_shader_src: `#version 300 es
    precision highp float;
    uniform int isDepthLinear;
    in vec4 fPos;
    out float oCol;
    void main() {
      float depth = (fPos.z / fPos.w) * 0.5 + 0.5;
      if (isDepthLinear == 0) {
        float far = 10.0;
        float near = 0.1;
        depth = (2.0 * near * far) / (far + near - depth * (far - near));
      }
      oCol = depth;
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
    ],

    uniforms: [
      ["uLightMat", "Matrix4fv"],
      ["uModel", "Matrix4fv"],
      ["isDepthLinear", "1i"],
    ],
  }),

  DEFERRED: (gl) => ({
    vertex_shader_src: `#version 300 es
    layout (location = 0) in vec3 vPos;
    layout (location = 1) in vec2 vTex;
    uniform mat4 uMatrix;
    out vec2 fTex;
    void main() {
      fTex = vTex;
      gl_Position = uMatrix * vec4(vPos, 1.0);
    }
    `,

    fragment_shader_src: DeferredFS,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
      ["vTex", 2, gl.FLOAT, 32, 12],
    ],

    uniforms: [
      ["uMatrix", "Matrix4fv"],
      ["uViewPos", "3fv"],

      ["uPosTex", "1i"],
      ["uColTex", "1i"],
      ["uNorTex", "1i"],
      ["uDepthTex", "1i"],
      ["uSSAOTex", "1i"],

      ["uDirectionalLight.dir", "3fv"],
      ["uDirectionalLight.col", "3fv"],
      ["uDirectionalLight.amb", "1f"],
      ["uDirectionalLight.dif", "1f"],
      ["uDirectionalLight.spe", "1f"],

      ...(new Array(NUM_PL).fill(null).map((_, ind) => ([
        ["uPointLights[" + ind + "].pos", "3fv"],
        ["uPointLights[" + ind + "].col", "3fv"],
        ["uPointLights[" + ind + "].amb", "1f"],
        ["uPointLights[" + ind + "].dif", "1f"],
        ["uPointLights[" + ind + "].spe", "1f"],
        // ["uPointLights[" + ind + "].con", "1f"],
        ["uPointLights[" + ind + "].lin", "1f"],
        ["uPointLights[" + ind + "].qua", "1f"],
      ])).flat()),

      ...(new Array(NUM_SL).fill(null).map((_, ind) => ([
        ["uSpotLights[" + ind + "].dir", "3fv"],
        ["uSpotLights[" + ind + "].pos", "3fv"],
        ["uSpotLights[" + ind + "].col", "3fv"],
        ["uSpotLights[" + ind + "].amb", "1f"],
        ["uSpotLights[" + ind + "].dif", "1f"],
        ["uSpotLights[" + ind + "].spe", "1f"],
        // ["uSpotLights[" + ind + "].con", "1f"],
        ["uSpotLights[" + ind + "].lin", "1f"],
        ["uSpotLights[" + ind + "].qua", "1f"],
        ["uSpotLights[" + ind + "].cutOff", "1f"],
        ["uSpotLights[" + ind + "].outerCutOff", "1f"],
      ])).flat()),

      ["uUseDirLightForShadow", "1i"],
      ["uDirLightMat", "Matrix4fv"],
      ["uDirShadowTex", "1i"],
      
      ["uUseSpotLightForShadow", "1i"],
      ...(new Array(NUM_SHADOW_CASTER).fill(null).map((_, ind) => ([
        ["uSpotLightMat[" + ind + "]", "Matrix4fv"],
      ])).flat()),
      ["uSpotShadowTexArr", "1i"],
    ],
  }),

}
