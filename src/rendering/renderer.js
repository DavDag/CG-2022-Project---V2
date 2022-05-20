import { Debug, Mat4, MatrixStack, Program, Quad, toRad, Vec2, Vec3, Vec4 } from "webgl-basic-lib";
import { CreateProgramFromData, NUM_SHADOW_CASTER, SHADERS, SHADOW_SIZE, SSAO_SAMPLE_COUNT } from "./shaders.js";
import { CreateSSAOKernels, CreateSSAONoise, UpdateSSAOUniforms } from "./ssao.js";

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

  #ssaoKernels = [];
  #ssaoNoise = [];
  #ssaoNoiseRaw = null;
  #ssaoFB = null;
  #ssaoColTex = null;
  #ssaoNoiseTex = null;
  #ssaoBlurFB = null;
  #ssaoBlurColTex = null;

  #shadowsFB = [];
  #shadowsDepthTex = [];

  aaSamples = 0;
  aaMaxSamples = 0;
  showPartialResults = false;
  showOccResults = false;

  #quad = null;

  #programs = {
    default: null,
    debugview: null,
    debugdraw: null,
    ssao: null,
    ssaoblur: null,
    shadowmap: null,
    deferred: null,
    textured: null,
  };

  constructor(gl) {
    this.#ctx = gl;
    this.#programs.default = CreateProgramFromData(gl, SHADERS.DEFAULT);
    this.#programs.debugview = CreateProgramFromData(gl, SHADERS.DEBUG_VIEW);
    this.#programs.debugdraw = CreateProgramFromData(gl, SHADERS.DEBUG_DRAW);
    this.#programs.ssao = CreateProgramFromData(gl, SHADERS.SSAO);
    this.#programs.ssaoblur = CreateProgramFromData(gl, SHADERS.SSAO_BLUR);
    this.#programs.shadowmap = CreateProgramFromData(gl, SHADERS.SHADOW_MAP);
    this.#programs.deferred = CreateProgramFromData(gl, SHADERS.DEFERRED);
    this.#programs.textured = CreateProgramFromData(gl, SHADERS.TEXTURED);

    this.#offscreenFB = gl.createFramebuffer();
    this.#offscreenPosTex =  gl.createTexture();
    this.#offscreenColTex =  gl.createTexture();
    this.#offscreenNorTex =  gl.createTexture();
    this.#offscreenDepthTex =  gl.createTexture();

    this.#offscreenFB2 = gl.createFramebuffer();
    this.#offscreenColTex2 =  gl.createRenderbuffer();
    this.#offscreenDepthTex2 =  gl.createRenderbuffer();

    this.#ssaoFB = gl.createFramebuffer();
    this.#ssaoColTex = gl.createTexture();
    this.#ssaoNoiseTex = gl.createTexture();

    this.#ssaoBlurFB = gl.createFramebuffer();
    this.#ssaoBlurColTex = gl.createTexture();

    this.#shadowsFB = new Array(NUM_SHADOW_CASTER).fill(null).map((_) => gl.createFramebuffer());
    this.#shadowsDepthTex = new Array(NUM_SHADOW_CASTER).fill(null).map((_) => gl.createTexture());

    this.#quad = Quad.asAdvancedShape().createBuffers(gl);
    
    this.#ssaoKernels = CreateSSAOKernels(SSAO_SAMPLE_COUNT);
    this.#ssaoNoise = CreateSSAONoise(16);
    this.#ssaoNoiseRaw = new Float32Array(this.#ssaoNoise.map((v) => [...v.values]).flat());
  }

  onResize(size) {
    const gl = this.#ctx;
    this.#size = size;
    this.aaMaxSamples = gl.getParameter(gl.MAX_SAMPLES);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.w, size.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, size.w, size.h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#offscreenNorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, size.w, size.h, 0, gl.RGBA, gl.HALF_FLOAT, null);
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

    // gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex2);
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.w, size.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#ssaoColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, size.w, size.h, 0, gl.RED, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#ssaoNoiseTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, 4, 4, 0, gl.RGB, gl.FLOAT, this.#ssaoNoiseRaw);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.bindTexture(gl.TEXTURE_2D, this.#ssaoBlurColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, size.w, size.h, 0, gl.RED, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.#shadowsDepthTex.forEach((tex) => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH24_STENCIL8, SHADOW_SIZE, SHADOW_SIZE, 0, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    });

    gl.bindTexture(gl.TEXTURE_2D, null);

    this.updateSamples(this.aaSamples);

    this.#bindAllToFB();
  }

  updateSamples() {
    const gl = this.#ctx;
    
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.#offscreenDepthTex2);
    // gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, this.#size.w, this.#size.h);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.aaSamples, gl.DEPTH24_STENCIL8, this.#size.w, this.#size.h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.#offscreenColTex2);
    // gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGB8, this.#size.w, this.#size.h);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.aaSamples, gl.RGB8, this.#size.w, this.#size.h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
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
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.#offscreenColTex2);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.#offscreenDepthTex2);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#ssaoFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#ssaoColTex, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#ssaoBlurFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#ssaoBlurColTex, 0);

    for (let i = 0; i < NUM_SHADOW_CASTER; ++i) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#shadowsFB[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, this.#shadowsDepthTex[i], 0);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  #drawImplForObj(object, material_mng, camera) {
    const obj = object.obj;
    const mat = object.matrix;

    if (object.hide || !obj || obj.hide) return;

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

  #drawForShadows(object, prog) {
    const obj = object.obj;
    const mat = object.matrix;

    if (object.hide || !obj || obj.hide) return;

    const gl = this.#ctx;

    prog.uModel.update(mat.values);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.rawVertBuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.rawLinesBuff);
    prog.enableAttributes();

    gl.drawArrays(gl.TRIANGLES, 0, obj.rawVertexesData.length / 8);
    
    prog.disableAttributes();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  #drawDebug(object, camera) {
    const obj = object.obj;
    const mat = object.matrix;

    if (object.hide || !obj || obj.hide) return;

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

      prog.uColor.update(new Vec4(1.0, 1.0, 1.0, 0.5).values);
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

    const lightMat = Mat4.Identity()
      .apply(Mat4.Orthogonal(-30, 30, -20, 20, 1.0, 75.0))
      .apply(Mat4.LookAt(new Vec3(-20, 20, -20), Vec3.Zeros(), new Vec3(0, 1, 0)));

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

    // Shadows
    {
      const prog = this.#programs.shadowmap;
      prog.use();

      prog.uLightMat.update(lightMat.values);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#shadowsFB[0]);
      gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);

      gl.clearDepth(1.0);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      gl.drawBuffers([
        gl.NONE,
      ]);

      gl.enable(gl.DEPTH_TEST);
      objects.forEach((object) => this.#drawForShadows(object, prog));
      this.#drawForShadows(player, prog);
      gl.disable(gl.DEPTH_TEST);

      prog.unbind();
      
      // {
      //   const prog = this.#programs.textured;
      //   prog.use();
  
      //   prog.uMatrix.update(quadMatRev.values);
      //   prog.uTexture.update(0);
  
      //   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      //   gl.viewport(0, 0, w, h);
  
      //   gl.clearColor(0, 0, 0, 1);
      //   gl.clear(gl.COLOR_BUFFER_BIT);
  
      //   gl.drawBuffers([
      //     gl.BACK,
      //   ]);
  
      //   gl.bindBuffer(gl.ARRAY_BUFFER, quad.vertbuff);
      //   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad.indibuff);
      //   prog.enableAttributes();
  
      //   gl.activeTexture(gl.TEXTURE0);
      //   gl.bindTexture(gl.TEXTURE_2D, this.#shadowsDepthTex[0]);
  
      //   gl.drawElements(gl.TRIANGLES, quad.numindi, gl.UNSIGNED_SHORT, 0);
  
      //   prog.disableAttributes();
      //   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      //   gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
      //   prog.unbind();
  
      //   return;
      // }
    }

    // SSAO
    {
      const kernels = this.#ssaoKernels;
      const prog = this.#programs.ssao;
      prog.use();

      prog.uMatrix.update(quadMatRev.values);
      prog.uPosTex.update(0);
      prog.uNorTex.update(1);
      prog.uDepthTex.update(2);
      prog.uNoiseTex.update(3);
      for (let k = 0; k < kernels.length; ++k) {
        prog["uSamples[" + k + "]"].update(kernels[k].values);
      }
      prog.uViewProj.update(camera.viewproj.values);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#ssaoFB);
      gl.viewport(0, 0, w, h);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
      ]);

      gl.bindBuffer(gl.ARRAY_BUFFER, quad.vertbuff);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad.indibuff);
      prog.enableAttributes();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);
      gl.activeTexture(gl.TEXTURE0 + 1);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenNorTex);
      gl.activeTexture(gl.TEXTURE0 + 2);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);
      gl.activeTexture(gl.TEXTURE0 + 3);
      gl.bindTexture(gl.TEXTURE_2D, this.#ssaoNoiseTex);

      gl.drawElements(gl.TRIANGLES, quad.numindi, gl.UNSIGNED_SHORT, 0);

      prog.disableAttributes();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      prog.unbind();
    }

    // Blur (on SSAO)
    {
      const prog = this.#programs.ssaoblur;
      prog.use();

      prog.uMatrix.update(quadMatRev.values);
      prog.uTexture.update(0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#ssaoBlurFB);
      gl.viewport(0, 0, w, h);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
      ]);

      gl.bindBuffer(gl.ARRAY_BUFFER, quad.vertbuff);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad.indibuff);
      prog.enableAttributes();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#ssaoColTex);

      gl.drawElements(gl.TRIANGLES, quad.numindi, gl.UNSIGNED_SHORT, 0);

      prog.disableAttributes();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      prog.unbind();

      // Debug show occ results
      if (this.showOccResults) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#ssaoBlurFB);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        
        gl.viewport(0, 0, w, h);
  
        gl.drawBuffers([
          gl.BACK,
        ]);
  
        gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.LINEAR);
  
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  
        return;
      }
    }

    // Deferred pass (or Debug View)
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
        prog.uSSAOTex.update(4);
        
        light_mng.updateUniforms(prog);

        prog.uShadowTex.update(5);
        prog.uLightMat.update(lightMat.values);
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

      if (!this.showPartialResults) {
        gl.activeTexture(gl.TEXTURE0 + 4);
        gl.bindTexture(gl.TEXTURE_2D, this.#ssaoBlurColTex);

        gl.activeTexture(gl.TEXTURE0 + 5 + 0);
        gl.bindTexture(gl.TEXTURE_2D, this.#shadowsDepthTex[0]);
      }

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
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        objects.forEach((object) => this.#drawDebug(object, camera));
        this.#drawDebug(player, camera);
        gl.disable(gl.BLEND);
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
