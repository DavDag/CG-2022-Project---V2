/** @author: Davide Risaliti davdag24@gmail.com */

import { LightManager } from "./managers/light_mng.js";
import { UIManager } from "./managers/ui_mng.js";
import { CameraManager } from "./managers/camera_mng.js";
import { Renderer } from "./rendering/renderer.js";
import { Player } from "./objects/player.js";
import { UpdateFps } from "./utils/fps_counter.js";

export class App {
  #ctx = null;

  #uiMng = null;
  #lightMng = null;
  #cameraMng = null;

  #renderer = null;
  #player = null;

  onResize(canvasSize, contextSize) {
    const gl = this.#ctx;
    gl.canvasEl.width  = canvasSize.w;
    gl.canvasEl.height = canvasSize.h;
    gl.viewport(0, 0, canvasSize.w, canvasSize.h);
    this.#cameraMng.onResize((contextSize.w / contextSize.h));
  }

  onKeyDown(event) {
    switch (event.key) {
      case "Shift": {
        this.#uiMng.showExtFunctions = !this.#uiMng.showExtFunctions;
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
        this.#player.reset();
        break;
      }
      case "l": {
        this.#lightMng.show = !this.#lightMng.show;
        break;
      }
    }
    this.#player.onKeyDown(event);
  }

  onKeyUp(event) {
    this.#player.onKeyUp(event);
  }

  #setup() {
    const gl = this.#ctx;
    this.#uiMng = new UIManager();
    this.#lightMng = new LightManager(gl);
    this.#cameraMng = new CameraManager(gl);
    this.#player = new Player(gl);
    this.#renderer = new Renderer(gl, this.#lightMng, this.#cameraMng, this.#player);
  }

  #update(dt) {
    this.#uiMng.update(dt);
    this.#player.update(dt);
    this.#cameraMng.updatePlayerMat(this.#player.matrix);
  }

  #draw() {
    this.#renderer.draw();
  }

  async run(gl) {
    this.#ctx = gl;
    this.#setup();
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