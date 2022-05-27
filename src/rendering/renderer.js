import { Debug, Mat4, MatrixStack, Program, Quad, toRad, Vec2, Vec3, Vec4 } from "webgl-basic-lib";
import { CreateProgramFromData, NUM_SHADOW_CASTER, SHADERS, HIGH_SHADOW_SIZE, SSAO_SAMPLE_COUNT, SMALL_SHADOW_SIZE } from "./shaders.js";
import { CreateSSAOKernels, CreateSSAONoise } from "./ssao.js";

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

  #ssaoKernels = [];
  #ssaoNoise = [];
  #ssaoNoiseRaw = null;
  #ssaoFB = null;
  #ssaoColTex = null;
  #ssaoNoiseTex = null;
  #ssaoBlurFB = null;
  #ssaoBlurColTex = null;

  #dirShadowsFB = null;
  #dirShadowsColTex = null;
  #dirShadowsDepthTex = null;
  #spotShadowsFB = null;
  #spotShadowsColTex = null;
  #spotShadowsDepthTex = null;

  #bloomFB = null;
  #bloomColTex = null;
  #bloomColTex2 = null;

  #rainFB = null;
  #rainColTex = null;

  aaSamples = 0;
  aaMaxSamples = 0;
  showPartialResults = false;
  showOccResults = false;
  showDirLightDepthTex = false;
  showBloomResults = false;

  showRain = true;

  #quad = null;

  #programs = {
    default: null,
    textured: null,
    debugview: null,
    debugdraw: null,
    ssao: null,
    blur: null,
    shadowmap: null,
    bloom: null,
    deferred: null,
    rain: null,
  };

  constructor(gl) {
    this.#ctx = gl;
    this.#programs.default = CreateProgramFromData(gl, SHADERS.DEFAULT);
    this.#programs.textured = CreateProgramFromData(gl, SHADERS.TEXTURED);
    this.#programs.debugview = CreateProgramFromData(gl, SHADERS.DEBUG_VIEW);
    this.#programs.debugdraw = CreateProgramFromData(gl, SHADERS.DEBUG_DRAW);
    this.#programs.ssao = CreateProgramFromData(gl, SHADERS.SSAO);
    this.#programs.blur = CreateProgramFromData(gl, SHADERS.BLUR);
    this.#programs.shadowmap = CreateProgramFromData(gl, SHADERS.SHADOW_MAP_DL);
    this.#programs.bloom = CreateProgramFromData(gl, SHADERS.BLOOM);
    this.#programs.deferred = CreateProgramFromData(gl, SHADERS.DEFERRED);
    this.#programs.rain = CreateProgramFromData(gl, SHADERS.RAIN);

    this.#offscreenFB = gl.createFramebuffer();
    this.#offscreenPosTex =  gl.createTexture();
    this.#offscreenColTex =  gl.createTexture();
    this.#offscreenNorTex =  gl.createTexture();
    this.#offscreenDepthTex =  gl.createTexture();

    this.#ssaoFB = gl.createFramebuffer();
    this.#ssaoColTex = gl.createTexture();
    this.#ssaoNoiseTex = gl.createTexture();

    this.#ssaoBlurFB = gl.createFramebuffer();
    this.#ssaoBlurColTex = gl.createTexture();

    this.#dirShadowsFB = gl.createFramebuffer();
    this.#dirShadowsColTex = gl.createTexture();
    this.#dirShadowsDepthTex = gl.createTexture();

    this.#spotShadowsFB = gl.createFramebuffer();
    this.#spotShadowsColTex = gl.createTexture();
    this.#spotShadowsDepthTex = gl.createTexture();

    this.#bloomFB = gl.createFramebuffer();
    this.#bloomColTex = gl.createTexture();
    this.#bloomColTex2 = gl.createTexture();
    
    this.#rainFB = gl.createFramebuffer();
    this.#rainColTex = gl.createTexture();

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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size.w, size.h, 0, gl.RGBA, gl.FLOAT, null);
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

    gl.bindTexture(gl.TEXTURE_2D, this.#ssaoColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, size.w, size.h, 0, gl.RED, gl.FLOAT, null);
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, size.w, size.h, 0, gl.RED, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#dirShadowsColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, HIGH_SHADOW_SIZE, HIGH_SHADOW_SIZE, 0, gl.RED, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#dirShadowsDepthTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH24_STENCIL8, HIGH_SHADOW_SIZE, HIGH_SHADOW_SIZE, 0, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#spotShadowsDepthTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH24_STENCIL8, SMALL_SHADOW_SIZE, SMALL_SHADOW_SIZE, 0, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#bloomColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size.w, size.h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#bloomColTex2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size.w, size.h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, this.#rainColTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size.w, size.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.#spotShadowsColTex);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.R32F, SMALL_SHADOW_SIZE, SMALL_SHADOW_SIZE, NUM_SHADOW_CASTER, 0, gl.RED, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);

    // this.updateSamples(this.aaSamples);

    this.#bindAllToFB();
  }

  #bindAllToFB() {
    const gl = this.#ctx;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#offscreenFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#offscreenColTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.#offscreenPosTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.#offscreenNorTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, this.#offscreenDepthTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#ssaoFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#ssaoColTex, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#ssaoBlurFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#ssaoBlurColTex, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#dirShadowsFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#dirShadowsColTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, this.#dirShadowsDepthTex, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#spotShadowsFB);
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.#spotShadowsColTex, 0, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, this.#spotShadowsDepthTex, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#bloomFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#bloomColTex, 0);
    // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#bloomColTex2, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#rainFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#rainColTex, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  #drawImplForObj(object, material_mng, light_mng, camera) {
    const obj = object.obj;
    const mat = object.matrix;

    if (object.hide || !obj || obj.hide) return;

    const gl = this.#ctx;
    const prog = this.#programs.default;
    const tmpStack = new MatrixStack();

    tmpStack.push(mat);

    prog.use();
    prog.uView.update(camera.view.values);
    prog.uProj.update(camera.proj.values);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.rawVertBuff);
    prog.enableAttributes();

    Object.values(obj.meshes).forEach((mesh) => {
      if (mesh.hide) return;
      
      const modelMat = tmpStack.push(mesh.matrix);
      prog.uModel.update(modelMat.values);

      mesh.sections.forEach((submesh) => {
        if (submesh.hide) return;

        const material = material_mng.get(light_mng.isDay, submesh.material);
        material.bindUniforms(prog);
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

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);

    tmpStack.pop();
    tmpStack.pop();
  }

  #drawQuad(prog) {
    const gl = this.#ctx;
    const quad = this.#quad;

    gl.bindBuffer(gl.ARRAY_BUFFER, quad.vertbuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad.indibuff);
    prog.enableAttributes();

    gl.drawElements(gl.TRIANGLES, quad.numindi, gl.UNSIGNED_SHORT, 0);

    prog.disableAttributes();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  #rainTime = 0;
  draw(dt, camera, light_mng, material_mng, player, objects, terrain) {
    this.#rainTime += dt / 1000.0;

    if (!this.#size) return;
    const [w, h] = this.#size.values;
    const gl = this.#ctx;
    const quadMatRev = Mat4.Identity().scale(new Vec3(2, -2, 1));

    var dirLightMat = Mat4.Identity();
    var spotLightMat = [];

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

      if (light_mng.isDay) {
        gl.clearColor(1, 1, 1, 1);
      } else {
        gl.clearColor(0, 0, 0, 1);
      }
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      terrain.forEach((object) => this.#drawImplForObj(object, material_mng, light_mng, camera));
      objects.forEach((object) => this.#drawImplForObj(object, material_mng, light_mng, camera));
      this.#drawImplForObj(player, material_mng, light_mng, camera);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.DEPTH_TEST);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Shadows (Dir Light)
    {
      const prog = this.#programs.shadowmap;
      prog.use();
      prog.isDepthLinear.update(1);

      dirLightMat = Mat4.Identity()
        // .apply(Mat4.Orthogonal(-10, 10, -10, 10, 1.0, 75.0))
        .apply(Mat4.Orthogonal(-30, 30, -20, 20, 1.0, 75.0))
        .apply(Mat4.LookAt(new Vec3(-20, 20, -20), Vec3.Zeros(), new Vec3(0, 1, 0)));

      prog.uLightMat.update(dirLightMat.values);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#dirShadowsFB);
      gl.viewport(0, 0, HIGH_SHADOW_SIZE, HIGH_SHADOW_SIZE);

      gl.clearColor(0, 0, 0, 1);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
      ]);

      if (light_mng.isDay) {
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        objects.forEach((object) => this.#drawForShadows(object, prog));
        this.#drawForShadows(player, prog);
        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
        terrain.forEach((object) => this.#drawForShadows(object, prog));
        gl.disable(gl.DEPTH_TEST);
      }

      prog.unbind();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // Debug
      if (this.showDirLightDepthTex) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#dirShadowsFB);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        
        gl.viewport(0, 0, HIGH_SHADOW_SIZE, HIGH_SHADOW_SIZE);
  
        gl.drawBuffers([
          gl.BACK,
        ]);
  
        gl.blitFramebuffer(0, 0, HIGH_SHADOW_SIZE, HIGH_SHADOW_SIZE, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

        return;
      }
    }
    
    // Shadows (Spot Light)
    {
      const prog = this.#programs.shadowmap;
      prog.use();
      prog.isDepthLinear.update(0);

      {
        if (!light_mng.isDay) {
          for (let i = 0; i < light_mng.spotLightCount; ++i) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.#spotShadowsFB);
            gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.#spotShadowsColTex, 0, i);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.#spotShadowsFB);
            gl.viewport(0, 0, SMALL_SHADOW_SIZE, SMALL_SHADOW_SIZE);
    
            gl.clearColor(0, 0, 0, 1);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
            gl.drawBuffers([
              gl.COLOR_ATTACHMENT0,
            ]);
    
            const lightPos = light_mng.spotLightPos(i).clone();
            const lightDir = light_mng.spotLightDir(i).clone();
          
            if (i < 2) {
              spotLightMat.push(
                Mat4.Identity()
                .apply(Mat4.Perspective(toRad(150), 1.0, 0.1, 10.0))
                .apply(Mat4.LookAt(lightPos, lightPos.clone().add(lightDir), new Vec3(0, 1, 0)))
              );
            } else {
              spotLightMat.push(
                Mat4.Identity()
                .apply(Mat4.Perspective(toRad(150), 1.0, 0.1, 10.0))
                .apply(Mat4.LookAt(lightPos, lightPos.clone().add(lightDir), new Vec3(1, 0, 0)))
              );
            }
            prog.uLightMat.update(spotLightMat.at(-1).values);        
  
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.FRONT);
            objects.forEach((object) => this.#drawForShadows(object, prog));
            this.#drawForShadows(player, prog);
            gl.cullFace(gl.BACK);
            gl.disable(gl.CULL_FACE);
            terrain.forEach((object) => this.#drawForShadows(object, prog));
            gl.disable(gl.DEPTH_TEST);

            // {
            //   gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#spotShadowsFB);
            //   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
            //   gl.viewport(0, 0, w, h);
            //   gl.drawBuffers([gl.BACK]);
            //   gl.blitFramebuffer(0, 0, SMALL_SHADOW_SIZE, SMALL_SHADOW_SIZE, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.LINEAR);
            //   return;
            // }
          }
        }
      }

      prog.unbind();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
      prog.uViewMat.update(camera.view.values);
      prog.uProjMat.update(camera.proj.values);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#ssaoFB);
      gl.viewport(0, 0, w, h);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
      ]);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);
      gl.activeTexture(gl.TEXTURE0 + 1);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenNorTex);
      gl.activeTexture(gl.TEXTURE0 + 2);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);
      gl.activeTexture(gl.TEXTURE0 + 3);
      gl.bindTexture(gl.TEXTURE_2D, this.#ssaoNoiseTex);

      this.#drawQuad(prog);

      prog.unbind();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0 + 1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0 + 2);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0 + 3);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Blur (on SSAO)
    {
      const prog = this.#programs.blur;
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

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#ssaoColTex);

      this.#drawQuad(prog);

      prog.unbind();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);

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

    // Bloom
    {
      // Mask
      {
        const prog = this.#programs.bloom;
        prog.use();
  
        prog.uMatrix.update(quadMatRev.values);
        prog.uTexture.update(0);
  
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.#bloomFB);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#bloomColTex, 0);
        gl.viewport(0, 0, w, h);
  
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
  
        gl.drawBuffers([
          gl.COLOR_ATTACHMENT0,
        ]);
  
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
  
        this.#drawQuad(prog);
  
        prog.unbind();
  
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      // Blur
      {
        const prog = this.#programs.blur;
        prog.use();
  
        prog.uMatrix.update(quadMatRev.values);
        prog.uTexture.update(0);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.#bloomFB);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#bloomColTex2, 0);
        gl.viewport(0, 0, w, h);
  
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
  
        gl.drawBuffers([
          gl.COLOR_ATTACHMENT0,
        ]);
  
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#bloomColTex);
  
        this.#drawQuad(prog);
  
        prog.unbind();
  
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      // Debug show bloom results
      if (this.showBloomResults) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#bloomFB);
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
        
        light_mng.updateUniforms(prog);

        prog.uUseDirLightForShadow.update(light_mng.isDay ? 1 : 0);
        prog.uDirLightMat.update(dirLightMat.values);
        
        prog.uUseSpotLightForShadow.update(spotLightMat.length);
        spotLightMat.forEach((mat, ind) => {
          prog["uSpotLightMat[" + ind + "]"].update(mat.values);
        });

        prog.uGamma.update(light_mng.gamma);
        prog.uExposure.update(light_mng.exposure);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, (this.showRain) ? this.#rainFB : null);
      gl.viewport(0, 0, w, h);

      gl.clearColor(0, 0, 0, 1);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      if (this.showRain) {
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      } else {
        gl.drawBuffers([gl.BACK]);
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenColTex);
      gl.activeTexture(gl.TEXTURE0 + 1);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenPosTex);
      gl.activeTexture(gl.TEXTURE0 + 2);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenNorTex);
      gl.activeTexture(gl.TEXTURE0 + 3);
      gl.bindTexture(gl.TEXTURE_2D, this.#offscreenDepthTex);

      if (!this.showPartialResults) {
        prog.uSSAOTex.update(4);
        gl.activeTexture(gl.TEXTURE0 + 4);
        gl.bindTexture(gl.TEXTURE_2D, this.#ssaoBlurColTex);

        prog.uDirShadowTex.update(5);
        gl.activeTexture(gl.TEXTURE0 + 5);
        gl.bindTexture(gl.TEXTURE_2D, this.#dirShadowsColTex);

        prog.uSpotShadowTexArr.update(6);
        gl.activeTexture(gl.TEXTURE0 + 6);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.#spotShadowsColTex);

        prog.uBloomTex.update(7);
        gl.activeTexture(gl.TEXTURE0 + 7);
        gl.bindTexture(gl.TEXTURE_2D, this.#bloomColTex2);
      }

      this.#drawQuad(prog);

      prog.unbind();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0 + 1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0 + 2);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0 + 3);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0 + 4);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0 + 5);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0 + 6);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
      gl.activeTexture(gl.TEXTURE0 + 7);
      gl.bindTexture(gl.TEXTURE_2D, null);
      
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Rain
    if (this.showRain) {
      const prog = this.#programs.rain;
      prog.use();

      prog.uMatrix.update(quadMatRev.values);
      prog.uTexture.update(0);
      prog.uTime.update(this.#rainTime);
      prog.uViewPos.update(camera.viewpos.values);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawBuffers([
        gl.BACK,
      ]);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#rainColTex);

      this.#drawQuad(prog);

      prog.unbind();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Debug
    if (!this.showPartialResults && !this.showRain) {
      // Copy depth buffer
      {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.#offscreenFB);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        
        gl.viewport(0, 0, w, h);
  
        gl.drawBuffers([
          gl.NONE,
        ]);
  
        gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
  
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      }
      
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.drawBuffers([
        gl.BACK,
      ]);

      // Meshes
      if (Debug.isActive) {
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        terrain.forEach((object) => this.#drawDebug(object, camera));
        objects.forEach((object) => this.#drawDebug(object, camera));
        this.#drawDebug(player, camera);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
      }
      
      // Lights
      this.#stack.push(camera.viewproj);
      light_mng.draw(this.#stack);
      this.#stack.pop();
 
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }
}
