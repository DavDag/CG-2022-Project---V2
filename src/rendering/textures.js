import { Texture } from "webgl-basic-lib";

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