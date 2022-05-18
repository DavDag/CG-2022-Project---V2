import { Mat4, toRad, Vec3, Vec4 } from "webgl-basic-lib";
import { SLight } from "../managers/light_mng.js";
import { CarController } from "../utils/car_controller.js";
import { OBJGraph } from "../utils/obj_loader.js";

const FRONT_VEC = new Vec3(0, 0, 1);

const HL_POS_L = new Vec3(-0.4, 0.25, 1);
const HL_POS_R = new Vec3(0.4, 0.25, 1);
const HL_COL = new Vec3(1, 1, 1);
const HL_DIR = new Vec3(0, 0, 1);
const HL_COEFF = {amb: 0.00, dif: 1.0, spe: 1.0};
const HL_FACT = {lin: 0.05, qua: 0.05};
const HL_CUTOFF = Math.cos(toRad(15));
const HL_OUTER_CUTOFF = Math.cos(toRad(35));

export class Player {
  #ctx = null;
  #mat = null;
  #matForCamera = null;
  #cachedMat = null;
  #obj = null;
  #controller = null;

  get obj() { return this.#obj; }
  get matrix() { return this.#cachedMat; }
  get posDirMatrix() { return this.#matForCamera; }
  get controller () { return this.#controller; }

  #lHeadLight = new SLight(HL_DIR, Vec3.Zeros(), HL_COL, HL_COEFF, HL_FACT, HL_CUTOFF, HL_OUTER_CUTOFF);
  #rHeadLight = new SLight(HL_DIR, Vec3.Zeros(), HL_COL, HL_COEFF, HL_FACT, HL_CUTOFF, HL_OUTER_CUTOFF);
  get lHeadLight() { return this.#lHeadLight; }
  get rHeadLight() { return this.#rHeadLight; }

  setup(gl, light_mng) {
    this.#ctx = gl;
    this.#controller = new CarController();
    this.#mat = Mat4.Identity().scale(Vec3.All(0.5));
    this.#matForCamera = Mat4.Identity();

    this.#loadAsync();
    this.#update();

    light_mng.addSL(this.lHeadLight);
    light_mng.addSL(this.rHeadLight);
  }

  #loadAsync() {
    const gl = this.#ctx;
    
    fetch("assets/cars/suv.obj")
      .then(async (resp) => {
        const text = await resp.text();
        this.#obj = OBJGraph.FromText(gl, text, false, {procUvs: (u, v) => [u / 100.0, v / 100.0]});
        console.log("Player", this.#obj);

        // this.#obj.meshes.body.hide = true;
        // this.#obj.meshes.wheel_backLeft.hide = true;
        // this.#obj.meshes.wheel_backRight.hide = true;
        // this.#obj.meshes.wheel_frontLeft.hide = true;
        // this.#obj.meshes.wheel_frontRight.hide = true;
      });
  }

  onKeyUp(event) { this.#controller.onKeyUp(event); }
  onKeyDown(event) { this.#controller.onKeyDown(event); }

  update(dt) {
    if (!this.#obj) return;

    this.#controller.update(dt);

    // TODO: Fix steer for non moving car
    this.#matForCamera.rotate(
      - this.#controller.turnSpeed * dt * this.#controller.rightFactor,
      new Vec3(0, 1, 0)
    );

    this.#matForCamera.translate(
      FRONT_VEC.clone()
        .mul(this.#controller.speed)
        .mul(dt)
    );

    this.#update();
  }

  reset() {
    this.#matForCamera = Mat4.Identity();
    this.#update();
  }

  #update() {
    this.#cachedMat = this.#matForCamera.clone().apply(this.#mat);
    const nDir = HL_DIR.toVec4(0).transform(this.#cachedMat).toVec3();
    this.#lHeadLight.dir = nDir;
    this.#rHeadLight.dir = nDir;
    this.#lHeadLight.pos = HL_POS_L.toVec4(1).transform(this.#cachedMat).toVec3();
    this.#rHeadLight.pos = HL_POS_R.toVec4(1).transform(this.#cachedMat).toVec3();
  }
}