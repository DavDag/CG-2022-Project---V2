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
    in vec2 fTex;
    uniform sampler2D uPosTex;
    uniform sampler2D uColTex;
    uniform sampler2D uNorTex;
    uniform sampler2D uDepthTex;
    out vec4 oColor;
    void main() {
      vec3 fPos = texture(uPosTex, fTex).xyz;
      vec3 fCol = texture(uColTex, fTex).rgb;
      vec3 fNor = texture(uNorTex, fTex).xyz;

      float fDepth = texture(uDepthTex, fTex).x;

      oColor = vec4(fCol, 1.0);
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

}
