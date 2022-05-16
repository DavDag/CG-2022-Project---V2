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

  #DL = null;
  #PL = [];
  #SL = [];

  show = false;

  dirLightsOff = false;
  pointLightsOff = false;
  spotLightsOff = false;

  constructor(gl) {
    this.#ctx = gl;
    this.#program = CreateProgramFromData(gl, SHADERS.COLORED);
    this.#sphere = Icosahedron.asAdvancedShape(0).createBuffers(gl);
  }

  addDL(DL) { this.#DL = DL; }
  addPL(PL) { this.#PL.push(PL); }
  addSL(SL) { this.#SL.push(SL); }

  updateUniforms(prog) {
    const DL = (this.#DL && !this.dirLightsOff) ? this.#DL : DEFAULT_DL;
    prog["uDirectionalLight.dir"].update(DL.dir.values);
    prog["uDirectionalLight.col"].update(DL.col.values);
    prog["uDirectionalLight.amb"].update(DL.amb);
    prog["uDirectionalLight.dif"].update(DL.dif);
    prog["uDirectionalLight.spe"].update(DL.spe);
  
    for (let i = 0; i < NUM_PL; ++i) {
      const PL = (this.#PL[i] && !this.pointLightsOff) ? this.#PL[i] : DEFAULT_PL;
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
      const SL = (this.#SL[i] && !this.spotLightsOff) ? this.#SL[i] : DEFAULT_SL;
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
    if (!this.show) return;

    this.#program.use();
    this.#program.uColor.update(new Vec4(1, 0, 0, 1).values);
      
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#sphere.vertbuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#sphere.indibuff);
    this.#program.enableAttributes();
    
    this.#PL.forEach((pl) => {
      if (!pl) return;
      const curr = stack.push(Mat4.Identity().translate(pl.pos).scale(Vec3.All(0.125)));
      this.#program.uMatrix.update(curr.values);
      gl.drawElements(gl.TRIANGLES, this.#sphere.numindi, gl.UNSIGNED_SHORT, 0);
      stack.pop();
    });
    
    this.#SL.forEach((sl) => {
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
