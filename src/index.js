/** @author: Davide Risaliti davdag24@gmail.com */

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import { RetrieveWebGLContext, Debug, SetResizeHandler, SetMouseHandler, SetKeyboardHandler, AddExtensions } from "webgl-basic-lib";
import { App } from './main.js';

const EXTENSIONS = [
  "EXT_color_buffer_float"
];

async function main() {
  try {
    const gl = RetrieveWebGLContext("webgl2", "main-canvas", { antialias: false }, true);
    Debug.Off();
    AddExtensions(gl, EXTENSIONS);
    const app = new App();
    SetResizeHandler(gl.canvasEl, app);
    SetMouseHandler(gl.canvasEl, app);
    SetKeyboardHandler(gl.canvasEl, app);
    await app.run(gl);
    console.log(app);
  } catch (e) {
    console.error(e);
  }
}

window.onload = main;
