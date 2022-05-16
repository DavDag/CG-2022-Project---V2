import { Debug, Mat4, MatrixStack, Program, Quad, toRad, Vec2, Vec3, Vec4 } from "webgl-basic-lib";
import { CreateProgramFromData, SHADERS } from "./shaders.js";

export class Renderer {
  #ctx = null;
  #stack = new MatrixStack();

  #size = null;

  #tmpFB = null;
  #tmpColRB = null;
  #tmpDepthRB = null;

  #offscreenFB = null;
  #offscreenColTex = null;
  #offscreenDepthTex = null;

  #programs = {
    default: null,

    blit: null,
  };

  constructor(gl) {
    this.#ctx = gl;
    this.#programs.default = CreateProgramFromData(gl, SHADERS.DEFAULT);
    this.#programs.blit = CreateProgramFromData(gl, SHADERS.BLIT);

    this.#offscreenFB = gl.createFramebuffer();
    this.#offscreenColTex =  gl.createTexture();
    this.#offscreenDepthTex =  gl.createTexture();

    this.#tmpFB = gl.createFramebuffer();
    this.#tmpColRB =  gl.createRenderbuffer();
    this.#tmpDepthRB =  gl.createRenderbuffer();
  }

  onResize(size) {
    const gl = this.#ctx;

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.w, size.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size.w, size.h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#offscreenFB);
    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#offscreenColTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.#offscreenDepthTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.bindRenderbuffer(gl.RENDERBUFFER, this.#tmpColRB);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, size.w, size.h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    gl.bindRenderbuffer(gl.RENDERBUFFER, this.#tmpDepthRB);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, size.w, size.h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#tmpFB);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.#tmpColRB);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.#tmpColRB);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.#tmpDepthRB);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.#tmpDepthRB);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.#size = size;
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

    stack.pop();
  }

  #drawDebug(object, stack) {
    const obj = object.obj;
    const mat = object.matrix;

    if (!obj) return;

    const gl = this.#ctx;
    const prog = this.#programs.default;
    stack.push(mat);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.rawVertBuff);
    prog.enableAttributes();

    Object.values(obj.meshes).forEach((mesh) => {
      if (mesh.hide) return;

      const curr = stack.push(mesh.matrix);

      Debug.drawPoints(obj.rawVertexesData, 8, curr, mesh.vBuffer.index, mesh.vBuffer.length, new Vec4(1, 0, 0, 1), 5.0);
      Debug.drawLines(obj.rawVertexesData, obj.rawLinesData, 8, curr, mesh.lBuffer.index, mesh.lBuffer.length, new Vec4(1, 1, 1, 1));

      stack.pop();
    });
    
    prog.disableAttributes();
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    prog.unbind();

    stack.pop();
  }

  draw(camera, light_mng, material_mng, player, objects) {
    if (!this.#size) return;

    const gl = this.#ctx;

    this.#stack.push(camera.viewproj);

    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#tmpFB);
      gl.viewport(0, 0, this.#size.w, this.#size.h);

      gl.clearColor(0, 0, 0, 1);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      objects.forEach((object) => this.#drawImplForObj(object, material_mng, this.#stack));
      this.#drawImplForObj(player, material_mng, this.#stack);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.disable(gl.DEPTH_TEST);
    }

    {
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.#offscreenFB);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#tmpFB);

      gl.viewport(0, 0, this.#size.w, this.#size.h);

      gl.blitFramebuffer(0, 0, this.#size.w, this.#size.h, 0, 0, this.#size.w, this.#size.h, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
      
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    }

    const quad = Quad.asAdvancedShape().createBuffers(gl);

    {
      this.#programs.blit.use();
      this.#programs.blit.uMatrix.update(Mat4.Identity().scale(Vec3.All(2)).values);
      this.#programs.blit.uTexture.update(0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.#size.w, this.#size.h);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);

      gl.bindBuffer(gl.ARRAY_BUFFER, quad.vertbuff);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad.indibuff);
      this.#programs.blit.enableAttributes();

      gl.drawElements(gl.TRIANGLES, quad.numindi, gl.UNSIGNED_SHORT, 0);

      this.#programs.blit.disableAttributes();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      gl.bindTexture(gl.TEXTURE_2D, null);

      this.#programs.blit.unbind();
    }

    // {
    //   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //   gl.viewport(0, 0, this.#size.w, this.#size.h);

    //   gl.enable(gl.DEPTH_TEST);

    //   objects.forEach((object) => this.#drawDebug(object, this.#stack));
    //   this.#drawDebug(player, this.#stack);

    //   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    //   gl.disable(gl.DEPTH_TEST);
    // }

    this.#stack.pop();
  }
}
