#version 300 es
precision highp float;
uniform sampler2D uTexture;
in vec2 fTex;
out vec4 oCol;
void main() {
  vec4 col = texture(uTexture, fTex);
  oCol = vec4(col.rgb / 0.5, 1.0);
}
