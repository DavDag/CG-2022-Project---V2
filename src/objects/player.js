import { Mat4, toRad, Vec3 } from "webgl-basic-lib";
import { CarController } from "../utils/car_controller.js";
import { OBJGraph } from "../utils/obj_loader.js";

const FRONT_VEC = new Vec3(0, 0, 1);

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

  setup(gl) {
    this.#ctx = gl;
    this.#controller = new CarController();

    this.#loadAsync();
  }

  #loadAsync() {
    const gl = this.#ctx;
    
    fetch("assets/cars/suv.obj")
      .then(async (resp) => {
        const text = await resp.text();
        this.#obj = OBJGraph.FromText(gl, text, false, {procUvs: (u, v) => [u / 100.0, v / 100.0]});
        this.#matForCamera = Mat4.Identity();
        this.#mat = Mat4.Identity().scale(Vec3.All(0.5));
        console.log("Player", this.#obj);

        // this.#obj.meshes.body.sections.forEach((sec) => sec.hide = true);
        // this.#obj.meshes.body.sections[2].hide = false;
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

    this.#cachedMat = this.#matForCamera.clone().apply(this.#mat);

    // this.#mat.rotate(toRad(30) * dt, new Vec3(0, 1, 0));
  }
}