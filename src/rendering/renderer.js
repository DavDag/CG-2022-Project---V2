import { MatrixStack } from "webgl-basic-lib";
import { CreateProgramFromData, SHADERS } from "./shaders.js";

export class Renderer {
  #ctx = null;
  #stack = new MatrixStack();

  #programs = {
    default: null
  };

  constructor(gl) {
    this.#ctx = gl;
    this.#programs.default = CreateProgramFromData(gl, SHADERS.DEFAULT);
  }

  #drawImplForObj(obj, mat, stack) {
    if (!obj) return;

    const gl = this.#ctx;
    const prog = this.#programs.default;
    stack.push(mat);

    prog.use();
    prog.uTexture.update(0);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.rawVertBuff);
    prog.enableAttributes();

    Object.values(obj.meshes).forEach((mesh) => {
      const curr = stack.push(mesh.matrix);
      prog.uMatrix.update(curr.values);

      mesh.sections.forEach((submesh) => {
        submesh.material.texture.bind(0);
        gl.drawArrays(gl.TRIANGLES, submesh.index, submesh.length);
      });

      stack.pop();
    });
    
    prog.disableAttributes();
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    prog.unbind();

    stack.pop();
  }

  draw(camera, light_mng, player, objects) {
    const gl = this.#ctx;

    this.#stack.push(camera.viewproj);

    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    {
      objects.forEach((object) => this.#drawImplForObj(object.obj, object.matrix, this.#stack));
      this.#drawImplForObj(player.obj, player.matrix, this.#stack);
    }

    gl.disable(gl.DEPTH_TEST);

    this.#stack.pop();
  }
}
