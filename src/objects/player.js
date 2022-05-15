import { Mat4 } from "webgl-basic-lib";
import { CarController } from "../utils/car_controller.js";


export class Player {
  #ctx = null;
  #controller = null;

  get matrix() { return Mat4.Identity(); }

  constructor(gl) {
    this.#ctx = gl;
    this.#controller = new CarController();
  }

  onKeyUp(event) { this.#controller.onKeyUp(event); }
  onKeyDown(event) { this.#controller.onKeyDown(event); }

  update(dt) {
    this.#controller.update(dt);
  }
}