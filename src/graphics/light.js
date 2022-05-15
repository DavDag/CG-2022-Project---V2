import { AdvancedShape, Debug, Icosahedron, LinesFromTriangles, Mat4, Shape, toRad, Vec3, Vec4 } from "webgl-basic-lib";
import { TemporaryTexture, CreateProgramFromData, PROGRAMS, SingleColorTexture } from "./shaders.js";

const DEFAULT_DL = {
  dir: Vec3.Zeros(),
  col: Vec3.Zeros(),
  amb: 0,
  dif: 0,
  spe: 0,
};

const DEFAULT_PL = {
  pos: Vec3.Zeros(),
  col: Vec3.Zeros(),
  amb: 0,
  dif: 0,
  spe: 0,
  con: 1,
  lin: 0,
  qua: 0,
};

const DEFAULT_SL = {
  dir: Vec3.Zeros(),
  pos: Vec3.Zeros(),
  col: Vec3.Zeros(),
  amb: 0,
  dif: 0,
  spe: 0,
  con: 1,
  lin: 0,
  qua: 0,
};

export class LightMng {
  #ctx = null;

  #DL = null;
  #PL = [];
  #SL = [];

  #obj = null;
  #buff = null;
  #col= null;
  #program = null;

  show = false;

  dirLightsOff = false;
  pointLightsOff = false;
  spotLightsOff = false;

  constructor(gl) {
    this.#ctx = gl;

    this.#col = new Vec3(1, 0, 0);
    this.#program = CreateProgramFromData(gl, PROGRAMS.COLORED);

    const shape = Icosahedron._build(2);
    this.#obj = new AdvancedShape("PointLight", shape.vertexes, shape.uvs, shape.normals, shape.triangles);
    this.#obj.lines = LinesFromTriangles(shape.vertexes, shape.triangles);
    this.#obj.lines = new Uint16Array(Shape.FlattenVecArray(this.#obj.lines));
    this.#obj.numLines = this.#obj.lines.length / 2;
    this.#buff = this.#obj.createBuffers(gl);
  }

  addDL(dir) {
    this.#DL = {
      dir,
      col: new Vec3(1, 1, 1),
      amb: 0.025,
      dif: 0.1,
      spe: 0.25,
    };
  }

  addPL(pos, col, props) {
    this.#PL.push({
      pos,
      col,
      mat: function() {
        return Mat4.Identity()
          .translate(pos)
          .scale(Vec3.All(0.125));
      },
      amb: 0.05,
      dif: 1.0,
      spe: 1.0,
      con: 1.0,
      lin: 0.14,
      qua: 0.07,
      ...props
    });
    return this.#PL.at(-1);
  }

  addSL(pos, dir, col, props) {
    this.#SL.push({
      pos,
      dir,
      col,
      mat: function() {
        return Mat4.Identity()
          .translate(this.pos)
          .scale(Vec3.All(0.125));
      },
      cutOff: Math.cos(toRad(12.5)),
      outerCutOff: Math.cos(toRad(15.0)),
      amb: 0.00,
      dif: 1.0,
      spe: 1.0,
      con: 1.0,
      lin: 0.09,
      qua: 0.032,
      ...props
    });
    return this.#SL.at(-1);
  }

  updateUniforms(prog) {
    const DL = (this.#DL && !this.dirLightsOff) ? this.#DL : DEFAULT_DL;
    prog["uDirectionalLight.dir"].update(DL.dir.values);
    prog["uDirectionalLight.col"].update(DL.col.values);
    prog["uDirectionalLight.amb"].update(DL.amb);
    prog["uDirectionalLight.dif"].update(DL.dif);
    prog["uDirectionalLight.spe"].update(DL.spe);
  
    for (let i = 0; i < 4; ++i) {
      const PL = (this.#PL[i] && !this.pointLightsOff) ? this.#PL[i] : DEFAULT_PL;
      prog["uPointLights[" + i + "].pos"].update(PL.pos.values);
      prog["uPointLights[" + i + "].col"].update(PL.col.values);
      prog["uPointLights[" + i + "].amb"].update(PL.amb);
      prog["uPointLights[" + i + "].dif"].update(PL.dif);
      prog["uPointLights[" + i + "].spe"].update(PL.spe);
      prog["uPointLights[" + i + "].con"].update(PL.con);
      prog["uPointLights[" + i + "].lin"].update(PL.lin);
      prog["uPointLights[" + i + "].qua"].update(PL.qua);
    }
    
    for (let i = 0; i < 2; ++i) {
      const SL = (this.#SL[i] && !this.spotLightsOff) ? this.#SL[i] : DEFAULT_SL;
      prog["uSpotLights[" + i + "].dir"].update(SL.dir.values);
      prog["uSpotLights[" + i + "].pos"].update(SL.pos.values);
      prog["uSpotLights[" + i + "].col"].update(SL.col.values);
      prog["uSpotLights[" + i + "].cutOff"].update(SL.cutOff);
      prog["uSpotLights[" + i + "].outerCutOff"].update(SL.outerCutOff);
      prog["uSpotLights[" + i + "].amb"].update(SL.amb);
      prog["uSpotLights[" + i + "].dif"].update(SL.dif);
      prog["uSpotLights[" + i + "].spe"].update(SL.spe);
      prog["uSpotLights[" + i + "].con"].update(SL.con);
      prog["uSpotLights[" + i + "].lin"].update(SL.lin);
      prog["uSpotLights[" + i + "].qua"].update(SL.qua);
    }
  }

  draw(camera, stack) {
    const gl = this.#ctx;
    if (!this.show) return;

    // gl.enable(gl.DEPTH_TEST);

    {
      this.#program.use();

      this.#program.uColor.update(this.#col.values);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#buff.vertbuff);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#buff.indibuff);
      this.#program.enableAttributes();

      this.#PL.forEach((pl) => {
        if (!pl) return;
        const curr = stack.push(pl.mat());
        this.#program.uMatrix.update(curr.values);      
        gl.drawElements(gl.TRIANGLES, this.#buff.numindi, gl.UNSIGNED_SHORT, 0);
        stack.pop();
      });

      this.#SL.forEach((sl) => {
        if (!sl) return;
        const curr = stack.push(sl.mat());
        this.#program.uMatrix.update(curr.values);      
        gl.drawElements(gl.TRIANGLES, this.#buff.numindi, gl.UNSIGNED_SHORT, 0);
        stack.pop();
      });

      this.#program.disableAttributes();
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      
      this.#program.unbind();
    }

    // this.#PL.forEach((pl) => {
    //   if (!pl) return;
    //   const curr = stack.push(pl.mat);
    //   Debug.drawPoints(this.#obj.vertexes, this.#obj.vertexSize(), curr, 0, this.#obj.numVertexes, new Vec4(1, 0, 0, 1), 5.0);
    //   Debug.drawLines(this.#obj.vertexes, this.#obj.lines, this.#obj.vertexSize(), curr, 0, this.#obj.numLines, new Vec4(1, 1, 1, 1));
    //   stack.pop();
    // });

    // gl.disable(gl.DEPTH_TEST);
  }
}
