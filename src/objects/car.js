import { Cube, Debug, LinesFromTriangles, Mat4, MatrixStack, Shape, Texture, toRad, Vec3, Vec4 } from "webgl-basic-lib";
import { LoadOBJ, OBJGraph } from "../utils/model_loader.js";
import { CAR, CreateProgramFromData, ENV, PROGRAMS, TemporaryTexture } from "../graphics/shaders.js";

const FRONT_VEC = new Vec3(0, 0, 1);

const FRONT_WHEELS_ORIGIN = new Vec3(0, 0.05, 0.25);
const FRONT_WHEELS_ORIGIN_NEG = FRONT_WHEELS_ORIGIN.clone().negate();

const EXT_LIGHT_PROPS = {
  cutOff: Math.cos(toRad(20)),
  outerCutOff: Math.cos(toRad(40)),
}

export class Car {
  #ctx = null;
  #lightMng = null;
  #stack = new MatrixStack();
  #controller = null;

  #obj = null;
  mat = Mat4.Identity();
  #program = null;
  #tex = null;

  #headLights = [];

  get lightPos() { return [new Vec3(0.1, 0.1, 0.35), new Vec3(-0.1, 0.1, 0.35)]; }
  get lightDir() { return [new Vec3(0, 0, 1), new Vec3(0, 0, 1)]; }
  get lightCol() { return [new Vec3(187, 208, 250).div(100), new Vec3(187, 208, 250).div(100)]; }

  constructor(gl, lightMng, controller) {
    this.#ctx = gl;
    this.#lightMng = lightMng;
    this.#controller = controller;
    this.#loadAsync();
    this.#headLights[0] = this.#lightMng.addSL(this.lightPos[0], this.lightDir[0], this.lightCol[0], EXT_LIGHT_PROPS);
    this.#headLights[1] = this.#lightMng.addSL(this.lightPos[1], this.lightDir[1], this.lightCol[1], EXT_LIGHT_PROPS);
  }

  #loadAsync() {
    const gl = this.#ctx;

    this.#program = CreateProgramFromData(gl, PROGRAMS.LIGHTED);
    this.#obj = undefined;
    this.#tex = TemporaryTexture(gl);

    fetch("assets/cars/RaceCar.obj")
      .then(async (resp) => {
        // console.log(resp);
        const text = await resp.text();
        const obj = OBJGraph.FromText(gl, text, true);
        console.log(obj);
        Object.values(obj.meshes).forEach((mesh) => { mesh.mat = Mat4.Identity(); });
        this.#obj = obj;
        this.mat = Mat4.Identity();
      });

    const configs = {
      target: gl.TEXTURE_2D,
      level: 0,
      format: gl.RGB,
      type: gl.UNSIGNED_BYTE,
      wrap: gl.REPEAT,
      filter: gl.LINEAR,
      genMipMap: false,
    }

    Texture
      .FromUrl(gl, "assets/cars/RaceCarTexture2.png", configs)
      .then((tex) => this.#tex = tex);
  }

  update(dt) {
    if (!this.#obj) return;

    // TODO: Fix steer for non moving car
    this.mat.rotate(
      - this.#controller.turnSpeed * dt * this.#controller.rightFactor,
      new Vec3(0, 1, 0)
    );

    this.mat.translate(
      FRONT_VEC.clone()
        .mul(this.#controller.speed)
        .mul(dt)
    );

    this.#obj.meshes.FrontWheels.mat
      .translate(FRONT_WHEELS_ORIGIN)
      .rotate(toRad(this.#controller.wheelSpeed) * dt, new Vec3(+1, 0, 0))
      .translate(FRONT_WHEELS_ORIGIN_NEG)
      ;

    this.#obj.meshes.BackWheels.mat
      .translate(new Vec3(0,  0.05, -0.23))
      .rotate(toRad(this.#controller.wheelSpeed) * dt, new Vec3(+1, 0, 0))
      .translate(new Vec3(0, -0.05,  0.23))
      ;
    
    this.#headLights.forEach((light, ind) => {
      light.pos = this.lightPos[ind].toVec4(1).transform(this.mat).toVec3();
      light.dir = this.lightDir[ind].toVec4(0).transform(this.mat).toVec3();
    });
  }

  draw(camera) {
    const gl = this.#ctx;
    if (!this.#obj) return;

    gl.enable(gl.DEPTH_TEST);
  
    // CAR
    {
      this.#stack.push(this.mat);
      this.#program.use();

      // this.#program.uModel.update(null);
      this.#program.uViewProj.update(camera.viewproj.values);
      this.#program.uViewPos.update(camera.viewpos.values);
      this.#program.uTexture.update(0);
  
      this.#lightMng.updateUniforms(this.#program);

      this.#tex.bind(0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.#obj.buff);
      this.#program.enableAttributes();
      this.#obj.meshesArray
        .forEach((mesh) => {
          const curr = this.#stack.push(mesh.mat);
          this.#program.uModel.update(curr.values);
          gl.drawArrays(gl.TRIANGLES, mesh.startIndexVertexRawBuffer, mesh.numVertexes);
          this.#stack.pop(); // Mesh
        });
      this.#program.disableAttributes();
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      
      this.#tex.unbind();
      this.#program.unbind();
      this.#stack.pop();
    }

    // DEBUG
    {
      this.#stack.push(camera.viewproj);
      this.#stack.push(this.mat);
      this.#obj.meshesArray
        .forEach((mesh) => {
          const curr = this.#stack.push(mesh.mat);
          this.#obj.drawPoints(mesh, curr, new Vec4(1, 0, 0, 1), 5.0);
          this.#obj.drawLines(mesh, curr, new Vec4(1, 1, 1, 1));
          this.#stack.pop(); // Mesh
        });
        this.#stack.pop();
        this.#stack.pop();
    }

    gl.disable(gl.DEPTH_TEST);
  }
}
