import { Icosahedron, Mat4, Vec3, Vec4 } from "webgl-basic-lib";
import { CreateProgramFromData, NUM_PL, NUM_SL, SHADERS } from "../rendering/shaders.js";

export class DLight {
  dir;
  col;
  amb;
  dif;
  spe;

  constructor(dir, col, coeff) {
    this.dir = dir;
    this.col = col;
    this.amb = coeff.amb;
    this.dif = coeff.dif;
    this.spe = coeff.spe;
  }
}

export class PLight {
  pos;
  col;
  amb;
  dif;
  // con: 1, Always 1
  spe;
  lin;
  qua;

  constructor(pos, col, coeff, factors) {
    this.pos = pos;
    this.col = col;
    this.amb = coeff.amb;
    this.dif = coeff.dif;
    this.spe = coeff.spe;
    this.lin = factors.lin;
    this.qua = factors.qua;
  }
}

export class SLight {
  dir;
  pos;
  col;
  amb;
  dif;
  spe;
  // con: 1, Always 1
  lin;
  qua;
  cutOff;
  outerCutOff;

  constructor(dir, pos, col, coeff, factors, cutOff, outerCutOff) {
    this.dir = dir;
    this.pos = pos;
    this.col = col;
    this.amb = coeff.amb;
    this.dif = coeff.dif;
    this.spe = coeff.spe;
    this.lin = factors.lin;
    this.qua = factors.qua;
    this.cutOff = cutOff;
    this.outerCutOff = outerCutOff;
  }
}

const DEFAULT_DL = new DLight(Vec3.Zeros(), Vec3.Zeros(), {amb: 0, dif: 0, spe: 0});
const DEFAULT_PL = new PLight(Vec3.Zeros(), Vec3.Zeros(), {amb: 0, dif: 0, spe: 0}, {lin: 0, qua: 0});
const DEFAULT_SL = new SLight(Vec3.Zeros(), Vec3.Zeros(), Vec3.Zeros(), {amb: 0, dif: 0, spe: 0}, {lin: 0, qua: 0}, 0, 0);

export class LightManager {
  #ctx = null;
  #program = null;
  #sphere = null;

  // Day
  #day = {
    DL: null,
    PL: [],
    SL: [],
  };

  // Night
  #night = {
    DL: null,
    PL: [],
    SL: [],
  };

  show = false;
  dirLightsOff = false;
  pointLightsOff = false;
  spotLightsOff = false;

  #isDay = true;
  get isDay() { return this.#isDay; }
  set isDay(value) { this.#isDay = value; this.#exposure = (this.isDay) ? 0.1 : 1.0; }

  constructor(gl) {
    this.#ctx = gl;
    this.#program = CreateProgramFromData(gl, SHADERS.COLORED);
    this.#sphere = Icosahedron.asAdvancedShape(0).createBuffers(gl);
  }

  get src() { return ((this.isDay) ? this.#day : this.#night); }

  #gamma = 1.0;
  get gamma() { return this.#gamma; }
  set gamma(value) { this.#gamma = value; }
  #exposure = 0.2;
  get exposure() { return this.#exposure; }
  set exposure(value) { this.#exposure = value; }

  get spotLightCount() { return this.src.SL.length; }
  spotLightPos(index) { return (this.src.SL[index] ?? DEFAULT_SL).pos; }
  spotLightDir(index) { return (this.src.SL[index] ?? DEFAULT_SL).dir; }

  addDL(forDay, DL) { ((forDay) ? this.#day : this.#night).DL = DL; }
  addPL(forDay, PL) { ((forDay) ? this.#day : this.#night).PL.push(PL); }
  addSL(forDay, SL) { ((forDay) ? this.#day : this.#night).SL.push(SL); }

  updateUniforms(prog) {
    const src = this.src;

    const DL = (src.DL && !this.dirLightsOff) ? src.DL : DEFAULT_DL;
    prog["uDirectionalLight.dir"].update(DL.dir.values);
    prog["uDirectionalLight.col"].update(DL.col.values);
    prog["uDirectionalLight.amb"].update(DL.amb);
    prog["uDirectionalLight.dif"].update(DL.dif);
    prog["uDirectionalLight.spe"].update(DL.spe);
  
    for (let i = 0; i < NUM_PL; ++i) {
      const PL = (src.PL[i] && !this.pointLightsOff) ? src.PL[i] : DEFAULT_PL;
      prog["uPointLights[" + i + "].pos"].update(PL.pos.values);
      prog["uPointLights[" + i + "].col"].update(PL.col.values);
      prog["uPointLights[" + i + "].amb"].update(PL.amb);
      prog["uPointLights[" + i + "].dif"].update(PL.dif);
      prog["uPointLights[" + i + "].spe"].update(PL.spe);
      // prog["uPointLights[" + i + "].con"].update(PL.con);
      prog["uPointLights[" + i + "].lin"].update(PL.lin);
      prog["uPointLights[" + i + "].qua"].update(PL.qua);
    }
    
    for (let i = 0; i < NUM_SL; ++i) {
      const SL = (src.SL[i] && !this.spotLightsOff) ? src.SL[i] : DEFAULT_SL;
      prog["uSpotLights[" + i + "].dir"].update(SL.dir.values);
      prog["uSpotLights[" + i + "].pos"].update(SL.pos.values);
      prog["uSpotLights[" + i + "].col"].update(SL.col.values);
      prog["uSpotLights[" + i + "].amb"].update(SL.amb);
      prog["uSpotLights[" + i + "].dif"].update(SL.dif);
      prog["uSpotLights[" + i + "].spe"].update(SL.spe);
      // prog["uSpotLights[" + i + "].con"].update(SL.con);
      prog["uSpotLights[" + i + "].lin"].update(SL.lin);
      prog["uSpotLights[" + i + "].qua"].update(SL.qua);
      prog["uSpotLights[" + i + "].cutOff"].update(SL.cutOff);
      prog["uSpotLights[" + i + "].outerCutOff"].update(SL.outerCutOff);
    }
  }

  draw(stack) {
    const gl = this.#ctx;
    const src = this.src;
    if (!this.show) return;

    this.#program.use();
    this.#program.uColor.update(new Vec4(1, 0, 0, 1).values);
      
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#sphere.vertbuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#sphere.indibuff);
    this.#program.enableAttributes();
    
    src.PL.forEach((pl) => {
      if (!pl) return;
      const curr = stack.push(Mat4.Identity().translate(pl.pos).scale(Vec3.All(0.125)));
      this.#program.uMatrix.update(curr.values);
      gl.drawElements(gl.TRIANGLES, this.#sphere.numindi, gl.UNSIGNED_SHORT, 0);
      stack.pop();
    });
    
    src.SL.forEach((sl) => {
      if (!sl) return;
      const curr = stack.push(Mat4.Identity().translate(sl.pos).scale(Vec3.All(0.125)));
      this.#program.uMatrix.update(curr.values);
      gl.drawElements(gl.TRIANGLES, this.#sphere.numindi, gl.UNSIGNED_SHORT, 0);
      stack.pop();
    });

    this.#program.disableAttributes();
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    this.#program.unbind();
  }
}
