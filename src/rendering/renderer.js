import { Debug, Mat4, MatrixStack, Program, Quad, toRad, Vec2, Vec3, Vec4 } from "webgl-basic-lib";
import { CreateProgramFromData, SHADERS } from "./shaders.js";

export class Renderer {
  /** @type {WebGL2RenderingContext} */
  #ctx = null;
  #stack = new MatrixStack();

  #size = null;

  #offscreenFB = null;
  #offscreenColTex = null;
  #offscreenPosTex = null;
  #offscreenNorTex = null;
  #offscreenDepthTex = null;

  #offscreenFB2 = null;
  #offscreenColTex2 = null;
  #offscreenDepthTex2 = null;

  showPartialResults = false;

  #quad = null;

  #programs = {
    default: null,
    debugview: null,
    debugdraw: null,
    deferred: null,
    textured: null,
  };

  constructor(gl) {
    this.#ctx = gl;
    this.#programs.default = CreateProgramFromData(gl, SHADERS.DEFAULT);
    this.#programs.debugview = CreateProgramFromData(gl, SHADERS.DEBUG_VIEW);
    this.#programs.debugdraw = CreateProgramFromData(gl, SHADERS.DEBUG_DRAW);
    this.#programs.deferred = CreateProgramFromData(gl, SHADERS.DEFERRED);
    this.#programs.textured = CreateProgramFromData(gl, SHADERS.TEXTURED);

    this.#offscreenFB = gl.createFramebuffer();
    this.#offscreenPosTex =  gl.createTexture();
    this.#offscreenColTex =  gl.createTexture();
    this.#offscreenNorTex =  gl.createTexture();
    this.#offscreenDepthTex =  gl.createTexture();

    this.#offscreenFB2 = gl.createFramebuffer();
    this.#offscreenColTex2 =  gl.createTexture();
    this.#offscreenDepthTex2 =  gl.createRenderbuffer();

    this.#quad = Quad.asAdvancedShape().createBuffers(gl);
  }

  onResize(size) {
    const gl = this.#ctx;

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.w, size.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size.w, size.h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenNorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size.w, size.h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH24_STENCIL8, size.w, size.h, 0, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.w, size.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindRenderbuffer(gl.RENDERBUFFER, this.#offscreenDepthTex2);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, size.w, size.h);

    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    this.#bindAllToFB();
    this.#size = size;
  }

  #bindAllToFB() {
    const gl = this.#ctx;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#offscreenFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#offscreenColTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.#offscreenPosTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.#offscreenNorTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, this.#offscreenDepthTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#offscreenFB2);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#offscreenColTex2, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.#offscreenDepthTex2);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  #drawImplForObj(object, material_mng, camera) {
    const obj = object.obj;
    const mat = object.matrix;

    if (!obj || obj.hide) return;

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
        prog["uMaterial.shininess"].update(material.shininess);

        gl.drawArrays(gl.TRIANGLES, submesh.index, submesh.length);
      });

      tmpStack.pop();
    });
    
    prog.disableAttributes();
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    prog.unbind();

    tmpStack.pop();
  }

  #drawDebug(object, camera) {
    const obj = object.obj;
    const mat = object.matrix;

    if (!obj || obj.hide) return;

    const gl = this.#ctx;
    const prog = this.#programs.debugdraw;
    const viewProj = camera.viewproj;

    const tmpStack = new MatrixStack();

    tmpStack.push(viewProj);
    tmpStack.push(mat);

    prog.use();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.rawVertBuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.rawLinesBuff);
    prog.enableAttributes();

    Object.values(obj.meshes).forEach((mesh) => {
      if (mesh.hide) return;

      const curr = tmpStack.push(mesh.matrix);
      prog.uMatrix.update(curr.values);

      prog.uPointSize.update(2.5);
      prog.uColor.update(new Vec4(1, 0, 0, 1).values);
      gl.drawArrays(gl.POINTS, mesh.vBuffer.index, mesh.vBuffer.length);

      prog.uColor.update(new Vec4(1.0, 1.0, 1.0, 0.2).values);
      gl.drawElements(gl.LINES, mesh.lBuffer.length * 2, gl.UNSIGNED_SHORT, mesh.lBuffer.index);

      tmpStack.pop();
    });
    
    prog.disableAttributes();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    prog.unbind();

    tmpStack.pop();
    tmpStack.pop();
  }

  draw(camera, light_mng, material_mng, player, objects) {
    if (!this.#size) return;
    const [w, h] = this.#size.values;
    const gl = this.#ctx;
    const quad = this.#quad;
    const quadMatRev = Mat4.Identity().scale(new Vec3(2, -2, 1));

    // First pass
    {
      this.#bindAllToFB();

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

    // Deferred pass
    {
      const prog = (this.showPartialResults) ? this.#programs.debugview : this.#programs.deferred;
      prog.use();

      prog.uMatrix.update(quadMatRev.values);
      prog.uColTex.update(0);
      prog.uPosTex.update(1);
      prog.uNorTex.update(2);
      prog.uDepthTex.update(3);

      if (!this.showPartialResults) {
        prog.uViewPos.update(camera.viewpos.values);
        light_mng.updateUniforms(prog);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#offscreenFB2);
      gl.viewport(0, 0, w, h);

      gl.clearColor(0, 0, 0, 1);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
      ]);

      gl.bindBuffer(gl.ARRAY_BUFFER, quad.vertbuff);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad.indibuff);
      prog.enableAttributes();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
      gl.activeTexture(gl.TEXTURE0 + 1);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);
      gl.activeTexture(gl.TEXTURE0 + 2);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenNorTex);
      gl.activeTexture(gl.TEXTURE0 + 3);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);

      gl.drawElements(gl.TRIANGLES, quad.numindi, gl.UNSIGNED_SHORT, 0);

      prog.disableAttributes();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      prog.unbind();
    }

    // // Copy depth buffer
    // {
    //   gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#offscreenFB);
    //   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      
    //   gl.viewport(0, 0, w, h);

    //   gl.drawBuffers([
    //     gl.NONE,
    //   ]);

    //   gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);

    //   gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    //   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    // }

    // Draw to screen
    {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#offscreenFB2);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      
      gl.viewport(0, 0, w, h);

      gl.drawBuffers([
        gl.BACK,
      ]);

      gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.LINEAR);

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }

    // Debug
    if (!this.showPartialResults) {
      // Meshes
      if (Debug.isActive) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, w, h);
  
        gl.drawBuffers([
          gl.BACK,
        ]);
  
        // gl.enable(gl.DEPTH_TEST);
        // gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        objects.forEach((object) => this.#drawDebug(object, camera));
        this.#drawDebug(player, camera);
        gl.disable(gl.BLEND);
        // gl.depthFunc(gl.LESS);
        // gl.disable(gl.DEPTH_TEST);
  
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

      // Lights
      this.#stack.push(camera.viewproj);
      light_mng.draw(this.#stack);
      this.#stack.pop();
    }
  }
}
