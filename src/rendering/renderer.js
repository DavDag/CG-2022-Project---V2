import { Debug, Mat4, MatrixStack, Program, Quad, toRad, Vec2, Vec3, Vec4 } from "webgl-basic-lib";
import { CreateProgramFromData, SHADERS } from "./shaders.js";

export class Renderer {
  #ctx = null;
  #stack = new MatrixStack();

  #size = null;

  #offscreenFB = null;
  #offscreenColTex = null;
  #offscreenPosTex = null;
  #offscreenNorTex = null;
  #offscreenDepthTex = null;

  showPartialResults = false;

  // #offscreenRB = null;
  // #offscreenColRB = null;
  // #offscreenDepthRB = null;

  #quad = null;

  #programs = {
    default: null,
    debug: null,
    deferred: null,
  };

  constructor(gl) {
    this.#ctx = gl;
    this.#programs.default = CreateProgramFromData(gl, SHADERS.DEFAULT);
    this.#programs.debug = CreateProgramFromData(gl, SHADERS.DEBUG_VIEW);
    this.#programs.deferred = CreateProgramFromData(gl, SHADERS.DEFERRED);

    this.#offscreenFB = gl.createFramebuffer();
    this.#offscreenPosTex =  gl.createTexture();
    this.#offscreenColTex =  gl.createTexture();
    this.#offscreenNorTex =  gl.createTexture();
    this.#offscreenDepthTex =  gl.createTexture();

    this.#quad = Quad.asAdvancedShape().createBuffers(gl);
    
    // this.#offscreenRB = gl.createFramebuffer();
    // this.#offscreenColRB = gl.createRenderbuffer();
    // this.#offscreenDepthRB = gl.createRenderbuffer();
  }

  onResize(size) {
    const gl = this.#ctx;

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.w, size.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size.w, size.h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenNorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size.w, size.h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size.w, size.h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.bindTexture(gl.TEXTURE_2D, null);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#offscreenFB);
    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#offscreenColTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.#offscreenPosTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenNorTex);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.#offscreenNorTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.#offscreenDepthTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // const maxSamples = gl.getParameter(gl.MAX_SAMPLES);
    // // console.log(maxSamples);

    // gl.bindFramebuffer(gl.FRAMEBUFFER, this.#offscreenRB);

    // gl.bindRenderbuffer(gl.RENDERBUFFER, this.#offscreenColRB);
    // gl.renderbufferStorageMultisample(gl.RENDERBUFFER, maxSamples, gl.RGBA8, size.w, size.h);
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.#offscreenColRB);

    // gl.bindRenderbuffer(gl.RENDERBUFFER, this.#offscreenDepthRB);
    // gl.renderbufferStorageMultisample(gl.RENDERBUFFER, maxSamples, gl.DEPTH_COMPONENT24, size.w, size.h);
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.#offscreenDepthRB);

    // gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.#size = size;
  }

  #drawImplForObj(object, material_mng, camera) {
    const obj = object.obj;
    const mat = object.matrix;

    if (!obj) return;

    const gl = this.#ctx;
    const prog = this.#programs.default;
    const viewProjMat = camera.viewproj;
    const tmpStack = new MatrixStack();

    tmpStack.push(mat);

    prog.use();
    prog.uTexture.update(0);
    prog.uViewProj.update(viewProjMat.values);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.rawVertBuff);
    prog.enableAttributes();

    Object.values(obj.meshes).forEach((mesh) => {
      if (mesh.hide) return;
      
      const modelMat = tmpStack.push(mesh.matrix);
      prog.uModel.update(modelMat.values);

      mesh.sections.forEach((submesh) => {
        if (submesh.hide) return;
        const material = material_mng.get(submesh.material);
        material.colorTex.bind(0);
        gl.drawArrays(gl.TRIANGLES, submesh.index, submesh.length);
      });

      tmpStack.pop();
    });
    
    prog.disableAttributes();
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    prog.unbind();

    tmpStack.pop();
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
    const [w, h] = this.#size.values;
    const gl = this.#ctx;
    const quad = this.#quad;

    // First pass
    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#offscreenFB);
      gl.viewport(0, 0, w, h);

      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
        gl.COLOR_ATTACHMENT1,
        gl.COLOR_ATTACHMENT2,
        gl.COLOR_ATTACHMENT3,
      ]);

      gl.clearColor(0, 0, 0, 1);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      objects.forEach((object) => this.#drawImplForObj(object, material_mng, camera));
      this.#drawImplForObj(player, material_mng, camera);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.disable(gl.DEPTH_TEST);
    }

    // Debug
    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#offscreenFB);
      gl.viewport(0, 0, w, h);
      
      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
      ]);
      
      gl.enable(gl.DEPTH_TEST);
      
      this.#stack.push(camera.viewproj);
      objects.forEach((object) => this.#drawDebug(object, this.#stack));
      this.#drawDebug(player, this.#stack);
      this.#stack.pop();

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.disable(gl.DEPTH_TEST);
    }

    // Adds AA
    // {
    //   gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#offscreenFB);
    //   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.#offscreenRB);
    //   gl.viewport(0, 0, w, h);
    //   gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT, gl.NEAREST);

    //   gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#offscreenRB);
    //   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.#offscreenFB);
    //   gl.viewport(0, 0, w, h);
    //   gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT, gl.NEAREST);
      
    //   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // }

    // Final Pass
    const prog = (this.showPartialResults) ? this.#programs.debug : this.#programs.deferred;
    {
      prog.use();

      const mat = Mat4.Identity().scale(new Vec3(2, -2, 1));
      prog.uMatrix.update(mat.values);
      prog.uColTex.update(0);
      prog.uPosTex.update(1);
      prog.uNorTex.update(2);
      prog.uDepthTex.update(3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);

      gl.bindBuffer(gl.ARRAY_BUFFER, quad.vertbuff);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad.indibuff);
      prog.enableAttributes();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenNorTex);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);

      gl.drawElements(gl.TRIANGLES, quad.numindi, gl.UNSIGNED_SHORT, 0);

      prog.disableAttributes();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      prog.unbind();
    }
  }
}
