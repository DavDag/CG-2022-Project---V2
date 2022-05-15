import { Program, Shader, Texture } from "webgl-basic-lib"

const tmpTextureData = new Uint8Array([
  255, 102, 204, 255, // x: 0, y: 0 (pink-ish)
  204, 102, 255, 255, // x: 1, y: 0 (violet-ish)
  204, 255, 102, 255, // x: 0, y: 1 (yellow-ish)
  102, 255, 204, 255, // x: 1, y: 1 (green-ish)
]);

var __tmp_tex = null;
export function TemporaryTexture(gl) {
  if (__tmp_tex != null) return __tmp_tex.clone();
  const id = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, id);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, tmpTextureData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, null);
  __tmp_tex = new Texture(gl, id, undefined);
  return __tmp_tex.clone();
}

export function SingleColorTexture(gl, colorBytes) {
  const id = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, id);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(colorBytes));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return new Texture(gl, id, undefined);
}

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

export const PROGRAMS = {

  /**
   * 
   */
  DEFAULT: (gl) => ({
    vertex_shader_src: `#version 300 es

    layout (location = 0) in vec3 vPos;
    layout (location = 1) in vec2 vTex;
    layout (location = 2) in vec3 vNor;
    
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

    uniform sampler2D uTexture;

    out vec4 oColor;

    void main() {
      vec4 col = texture(uTexture, fTex);
      oColor = col;
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
      ["vTex", 2, gl.FLOAT, 32, 12],
      ["vNor", 3, gl.FLOAT, 32, 20],
    ],

    uniforms: [
      ["uMatrix", "Matrix4fv"],
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

    uniform vec3 uColor;

    out vec4 oColor;

    void main() {
      oColor = vec4(uColor, 1.0);
    }
    `,

    attributes: [
      ["vPos", 3, gl.FLOAT, 32,  0],
    ],

    uniforms: [
      ["uMatrix", "Matrix4fv"],
      ["uColor", "3fv"],
    ],
  }),

  /**
   */
  LIGHTED: (gl) => ({
    vertex_shader_src: `#version 300 es

    layout (location = 0) in vec3 vPos;
    layout (location = 1) in vec2 vTex;
    layout (location = 2) in vec3 vNor;

    uniform mat4 uModel;
    uniform mat4 uViewProj;
    
    out vec3 fPos;
    out vec3 fNor;
    out vec2 fTex;

    void main() {
      fPos = vec3(uModel * vec4(vPos, 1.0));
      fNor = mat3(transpose(inverse(uModel))) * vNor;
      fTex = vTex;

      gl_Position = uViewProj * vec4(fPos, 1.0);
    }
    `,

    fragment_shader_src: `#version 300 es
    precision highp float;

    #define NUM_PL 4
    #define NUM_SL 2

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
      
      float con;
      float lin;
      float qua;
  
      float amb;
      float dif;
      float spe;
    };

    struct SLight {
        vec3 dir;
        vec3 pos;
        vec3 col;

        float cutOff;
        float outerCutOff;
      
        float con;
        float lin;
        float qua;
      
        float amb;
        float dif;
        float spe;       
    };

    vec3 CalcDLight(DLight light, vec3 normal, vec3 viewDir);
    vec3 CalcPLight(PLight light, vec3 normal, vec3 fPos, vec3 viewDir);
    vec3 CalcSLight(SLight light, vec3 normal, vec3 fPos, vec3 viewDir);

    in vec3 fPos;
    in vec3 fNor;
    in vec2 fTex;

    uniform vec3 uViewPos;
    uniform sampler2D uTexture;
    uniform DLight uDirectionalLight;
    uniform PLight uPointLights[NUM_PL];
    uniform SLight uSpotLights[NUM_SL];

    out vec4 oColor;

    void main() {
      vec3 normal = normalize(fNor);
      vec3 viewDir = normalize(uViewPos);
      vec3 result = vec3(0, 0, 0);

      result += CalcDLight(uDirectionalLight, normal, viewDir);
      for (int i = 0; i < NUM_PL; ++i) {
        result += CalcPLight(uPointLights[i], normal, fPos, viewDir);
      }
      for (int i = 0; i < NUM_SL; ++i) {
        result += CalcSLight(uSpotLights[i], normal, fPos, viewDir);
      }

      oColor = vec4(result, 1.0);
    }

    vec3 CalcDLight(DLight light, vec3 normal, vec3 viewDir)
    {
      vec3 lightDir = normalize(-light.dir);

      float diff = max(dot(normal, lightDir), 0.0);

      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0);

      vec3 color = texture(uTexture, fTex).rgb;

      vec3 ambient = light.amb * light.col * color;
      vec3 diffuse = light.dif * light.col * diff * color;
      vec3 specular = light.spe * light.col * spec * vec3(0.5);

      return (ambient + diffuse + specular);
    }

    vec3 CalcPLight(PLight light, vec3 normal, vec3 fPos, vec3 viewDir)
    {
      vec3 lightDir = normalize(light.pos - fPos);

      float diff = max(dot(normal, lightDir), 0.0);

      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

      float distance = length(light.pos - fPos);
      float attenuation = 1.0 / (light.con + light.lin * distance + light.qua * (distance * distance));

      vec3 texColor = texture(uTexture, fTex).rgb;

      vec3 ambient = light.amb * light.col * texColor;
      vec3 diffuse = light.dif * light.col * diff * texColor;
      vec3 specular = light.spe * light.col * spec;

      ambient *= attenuation;
      diffuse *= attenuation;
      specular *= attenuation;

      return (ambient + diffuse + specular);
    }

    vec3 CalcSLight(SLight light, vec3 normal, vec3 fPos, vec3 viewDir)
    {
      vec3 lightDir = normalize(light.pos - fPos);

      float diff = max(dot(normal, lightDir), 0.0);

      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

      float distance = length(light.pos - fPos);
      float attenuation = 1.0 / (light.con + light.lin * distance + light.qua * (distance * distance));    

      float theta = dot(lightDir, normalize(-light.dir)); 
      float epsilon = light.cutOff - light.outerCutOff;
      float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);

      vec3 texColor = texture(uTexture, fTex).rgb;

      vec3 ambient = light.amb * light.col * texColor;
      vec3 diffuse = light.dif * light.col * diff * texColor;
      vec3 specular = light.spe * light.col * spec * 1.0;

      ambient *= attenuation * intensity;
      diffuse *= attenuation * intensity;
      specular *= attenuation * intensity;

      return (ambient + diffuse + specular);
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
      ["uViewPos", "3fv"],
      ["uTexture", "1i"],

      ["uDirectionalLight.dir", "3fv"],
      ["uDirectionalLight.col", "3fv"],
      ["uDirectionalLight.amb", "1f"],
      ["uDirectionalLight.dif", "1f"],
      ["uDirectionalLight.spe", "1f"],

      ...(new Array(4).fill(null).map((_, ind) => ([
        ["uPointLights[" + ind + "].pos", "3fv"],
        ["uPointLights[" + ind + "].col", "3fv"],
        ["uPointLights[" + ind + "].amb", "1f"],
        ["uPointLights[" + ind + "].dif", "1f"],
        ["uPointLights[" + ind + "].spe", "1f"],
        ["uPointLights[" + ind + "].con", "1f"],
        ["uPointLights[" + ind + "].lin", "1f"],
        ["uPointLights[" + ind + "].qua", "1f"],
      ])).flat()),

      ...(new Array(2).fill(null).map((_, ind) => ([
        ["uSpotLights[" + ind + "].dir", "3fv"],
        ["uSpotLights[" + ind + "].pos", "3fv"],
        ["uSpotLights[" + ind + "].col", "3fv"],
        ["uSpotLights[" + ind + "].cutOff", "1f"],
        ["uSpotLights[" + ind + "].outerCutOff", "1f"],
        ["uSpotLights[" + ind + "].amb", "1f"],
        ["uSpotLights[" + ind + "].dif", "1f"],
        ["uSpotLights[" + ind + "].spe", "1f"],
        ["uSpotLights[" + ind + "].con", "1f"],
        ["uSpotLights[" + ind + "].lin", "1f"],
        ["uSpotLights[" + ind + "].qua", "1f"],
      ])).flat()),
    ],
  }),
}
