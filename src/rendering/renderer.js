import { Debug, MatrixStack, Vec3, Vec4 } from "webgl-basic-lib";
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

  #drawImplForObj(object, material_mng, stack) {
    const obj = object.obj;
    const mat = object.matrix;

    if (!obj) return;

    const gl = this.#ctx;
    const prog = this.#programs.default;
    stack.push(mat);

    prog.use();
    prog.uTexture.update(0);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.rawVertBuff);
    prog.enableAttributes();

    Object.values(obj.meshes).forEach((mesh) => {
      if (mesh.hide) return;
      
      const curr = stack.push(mesh.matrix);
      prog.uMatrix.update(curr.values);

      mesh.sections.forEach((submesh) => {
        if (submesh.hide) return;
        const material = material_mng.get(submesh.material);
        material.colorTex.bind(0);
        gl.drawArrays(gl.TRIANGLES, submesh.index, submesh.length);
      });

      stack.pop();
    });
    
    prog.disableAttributes();
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    prog.unbind();

    // Debug
    Object.values(obj.meshes).forEach((mesh) => {
      if (mesh.hide) return;

      const curr = stack.push(mesh.matrix);

      Debug.drawPoints(obj.rawVertexesData, 8, curr, mesh.vBuffer.index, mesh.vBuffer.length, new Vec4(1, 0, 0, 1), 5.0);
      Debug.drawLines(obj.rawVertexesData, obj.rawLinesData, 8, curr, mesh.lBuffer.index, mesh.lBuffer.length, new Vec4(1, 1, 1, 1));

      stack.pop();
    });

    stack.pop();
  }

  draw(camera, light_mng, material_mng, player, objects) {
    const gl = this.#ctx;

    this.#stack.push(camera.viewproj);

    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    {
      objects.forEach((object) => this.#drawImplForObj(object, material_mng, this.#stack));
      this.#drawImplForObj(player, material_mng, this.#stack);
    }

    gl.disable(gl.DEPTH_TEST);

    this.#stack.pop();
  }
}
