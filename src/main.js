/** @author: Davide Risaliti davdag24@gmail.com */

import { Debug, Mat4, Vec3 } from "webgl-basic-lib";
import { CameraManager } from "./utils/camera.js";
import { Car } from "./objects/car.js";
import { Environment } from "./objects/environment.js";
import { CarController } from "./utils/car_controller.js";
import { UI } from "./ui.js";
import { UpdateFps } from "./utils/fps_counter.js";
import { LightMng } from "./graphics/light.js";

export class App {
  #ctx = null;
  #ui = null;
  #lightMng = null;
  #cameraMng = null;
  #environment = null;
  #car = null;
  #controller = null;

  onResize(canvasSize, contextSize) {
    const gl = this.#ctx;

    console.log("Resize", canvasSize.toString(0), contextSize.toString(0));

    gl.canvasEl.width  = canvasSize.w;
    gl.canvasEl.height = canvasSize.h;
    // gl.canvas.width    = contextSize.w;
    // gl.canvas.height   = contextSize.h;
    // gl.viewport(0, 0, contextSize.w, contextSize.h);
    gl.viewport(0, 0, canvasSize.w, canvasSize.h);
    
    const factor = contextSize.w / contextSize.h;
    this.#cameraMng.onResize(factor);
  }

  onKeyDown(event) {
    // console.log(event);
    switch (event.key) {
      case "Shift": {
        this.#ui.showExtFunctions = !this.#ui.showExtFunctions;
        break;
      }
      case "1": {
        Debug.Toggle();
        break;
      }
      case "7": {
        this.#lightMng.dirLightsOff = !this.#lightMng.dirLightsOff;
        break;
      }
      case "8": {
        this.#lightMng.pointLightsOff = !this.#lightMng.pointLightsOff;
        break;
      }
      case "9": {
        this.#lightMng.spotLightsOff = !this.#lightMng.spotLightsOff;
        break;
      }
      case "c": {
        this.#cameraMng.nextCamera();
        break;
      }
      case "r": {
        this.#car.mat = Mat4.Identity();
        break;
      }
      case "l": {
        this.#lightMng.show = !this.#lightMng.show;
        break;
      }
    }
    this.#controller.onKeyDown(event);
  }

  onKeyUp(event) {
    switch (event.key) {
    }
    this.#controller.onKeyUp(event);
  }

  async #setup() {
    const gl = this.#ctx;
    this.#ui = new UI(gl);
    this.#lightMng = new LightMng(gl);
    this.#lightMng.addDL(new Vec3(1, -1, 0.25));
    this.#cameraMng = new CameraManager();
    this.#environment = new Environment(gl, this.#lightMng);
    this.#controller = new CarController();
    this.#car = new Car(gl, this.#lightMng, this.#controller);
  }

  #update(dt) {
    this.#environment.update(dt);
    this.#controller.update(dt);
    this.#car.update(dt);

    this.#ui.update(dt, this.#car, this.#controller, this.#lightMng);
  }

  #draw() {
    this.#cameraMng.onPrepare(this.#car);

    const gl = this.#ctx;
    const camera = this.#cameraMng.current;

    // Clear
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Environment
    this.#environment.draw(camera);

    // Car
    this.#car.draw(camera);
    
    // UI
    this.#ui.draw();
  }

  async run(gl) {
    this.#ctx = gl;
    await this.#setup();
    const draw = (now) => {
      try {
        const dt = UpdateFps(now);
        // TODO: Profiling
        this.#update(dt);
        this.#draw();
        requestAnimationFrame(draw);
      } catch(e) {
        console.error(e);
        return;
      }
    }
    requestAnimationFrame(draw);
  }
}