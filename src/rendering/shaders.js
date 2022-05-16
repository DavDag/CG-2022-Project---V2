import { Program, Shader } from "webgl-basic-lib";

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

export const NUM_PL = 4;
export const NUM_SL = 4;

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
    in vec3 fPos;
    in vec2 fTex;
    in vec3 fNor;
    uniform sampler2D uTexture;
    layout (location = 0) out vec4 oCol;
    layout (location = 1) out vec4 oPos;
    layout (location = 2) out vec4 oNor;
    void main() {
      vec4 col = texture(uTexture, fTex);
      oCol = col;
      oPos = vec4(fPos, 1.0);
      oNor = vec4(normalize(fNor), 0.0);
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
      vec3 fPos = texture(uPosTex, fTex * 2.0).xyz;
      vec3 fCol = texture(uColTex, fTex * 2.0).rgb;
      vec3 fNor = texture(uNorTex, fTex * 2.0).xyz;
      float fDepth = texture(uDepthTex, fTex * 2.0).x;

      if (fTex.y > 0.5) {
        if (fTex.x > 0.5) {
          oColor = vec4(fPos, 1.0);
        } else {
          oColor = vec4(fCol, 1.0);
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

    fragment_shader_src: `#version 300 es
    precision highp float;

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

    vec3 CalcDLight(DLight light, vec3 color, vec3 normal, vec3 viewDir);
    vec3 CalcPLight(PLight light, vec3 color, vec3 normal, vec3 fPos, vec3 viewDir);
    vec3 CalcSLight(SLight light, vec3 color, vec3 normal, vec3 fPos, vec3 viewDir);

    uniform sampler2D uPosTex;
    uniform sampler2D uColTex;
    uniform sampler2D uNorTex;
    uniform sampler2D uDepthTex;

    uniform vec3 uViewPos;
    uniform DLight uDirectionalLight;
    uniform PLight uPointLights[${NUM_PL}];
    uniform SLight uSpotLights[${NUM_SL}];

    in vec2 fTex;

    out vec4 oColor;

    void main() {
      vec3 fPos = texture(uPosTex, fTex).xyz;
      vec3 fCol = texture(uColTex, fTex).rgb;
      vec3 fNor = texture(uNorTex, fTex).xyz;
      float fDepth = texture(uDepthTex, fTex).x;

      vec3 viewDir = normalize(uViewPos);
      vec3 result = vec3(0, 0, 0);

      result += CalcDLight(uDirectionalLight, fCol, fNor, viewDir);
      for (int i = 0; i < ${NUM_PL}; ++i) {
        result += CalcPLight(uPointLights[i], fCol, fNor, fPos, viewDir);
      }
      for (int i = 0; i < ${NUM_SL}; ++i) {
        result += CalcSLight(uSpotLights[i], fCol, fNor, fPos, viewDir);
      }

      oColor = vec4(result, 1.0);
    }

    vec3 CalcDLight(
      DLight light,
      vec3 color,
      vec3 normal,
      vec3 viewDir
    ) {
      vec3 lightDir = normalize(-light.dir);

      float diff = max(dot(normal, lightDir), 0.0);

      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

      vec3 ambient = light.amb * light.col * color;
      vec3 diffuse = light.dif * light.col * diff * color;
      vec3 specular = light.spe * light.col * spec;

      return (ambient + diffuse + specular);
    }

    vec3 CalcPLight(
      PLight light,
      vec3 color,
      vec3 normal,
      vec3 fPos,
      vec3 viewDir
    ) {
      vec3 lightDir = normalize(light.pos - fPos);

      float diff = max(dot(normal, lightDir), 0.0);

      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

      float distance = length(light.pos - fPos);
      float attenuation = 1.0 / (1.0 + light.lin * distance + light.qua * (distance * distance));

      vec3 ambient = light.amb * light.col * color;
      vec3 diffuse = light.dif * light.col * diff * color;
      vec3 specular = light.spe * light.col * spec;

      ambient *= attenuation;
      diffuse *= attenuation;
      specular *= attenuation;

      return (ambient + diffuse + specular);
    }

    vec3 CalcSLight(
      SLight light,
      vec3 color,
      vec3 normal,
      vec3 fPos,
      vec3 viewDir
    ) {
      vec3 lightDir = normalize(light.pos - fPos);

      float diff = max(dot(normal, lightDir), 0.0);

      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

      float distance = length(light.pos - fPos);
      float attenuation = 1.0 / (1.0 + light.lin * distance + light.qua * (distance * distance));    

      float theta = dot(lightDir, normalize(-light.dir)); 
      float epsilon = light.cutOff - light.outerCutOff;
      float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);

      vec3 ambient = light.amb * light.col * color;
      vec3 diffuse = light.dif * light.col * diff * color;
      vec3 specular = light.spe * light.col * spec;

      ambient *= attenuation * intensity;
      diffuse *= attenuation * intensity;
      specular *= attenuation * intensity;

      return (ambient + diffuse + specular);
    }
    `,

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
    ],
  }),

}
