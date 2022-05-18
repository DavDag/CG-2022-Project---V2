/** @author: Davide Risaliti davdag24@gmail.com */

import { DLight, LightManager } from "./managers/light_mng.js";
import { UIManager } from "./managers/ui_mng.js";
import { CameraManager } from "./managers/camera_mng.js";
import { Renderer } from "./rendering/renderer.js";
import { Player } from "./objects/player.js";
import { UpdateFps } from "./utils/fps_counter.js";
import { Terrain } from "./objects/terrain.js";
import { Debug, Vec3 } from "webgl-basic-lib";
import { MaterialsManager } from "./managers/material_mng.js";
import { StreetLamp } from "./objects/street_lamp.js";

function CreateStreetLights() {
  const lamps = [];
  lamps.push(new StreetLamp(new Vec3(1, 0, 0), 90));
  lamps.push(new StreetLamp(new Vec3(-1, 0, 0), 270));
  return lamps;
}

export class App {
  #ctx = null;

  #uiMng = null;
  #lightMng = null;
  #cameraMng = null;
  #materialMng = null;

  #renderer = null;
  #player = new Player();
  #objects = [
    new Terrain(),
    ... CreateStreetLights(),
  ];

  onResize(canvasSize, contextSize) {
    const gl = this.#ctx;
    gl.canvasEl.width  = canvasSize.w;
    gl.canvasEl.height = canvasSize.h;
    gl.viewport(0, 0, canvasSize.w, canvasSize.h);
    this.#cameraMng.onResize((canvasSize.w / canvasSize.h));
    this.#renderer.onResize(canvasSize);
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
      case "2": {
        this.#renderer.antiAliasingMethod = (this.#renderer.antiAliasingMethod + 1) % 2;
        break;
      }
      case "5": {
        this.#renderer.showPartialResults = !this.#renderer.showPartialResults;
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
      case "f": {
        this.#cameraMng.forceFollowPlayer = (this.#cameraMng.forceFollowPlayer + 1) % 3;
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
    this.#materialMng = new MaterialsManager(gl);
    this.#renderer = new Renderer(gl);

    this.#player.setup(gl);
    this.#objects.forEach((obj) => obj.setup(gl, this.#lightMng));

    this.#lightMng.addDL(new DLight(
      new Vec3(0, -1, 0),
      new Vec3(1, 1, 1),
      {amb: 0.01, dif: 0.2, spe: 0.1}
    ));
  }

  #update(dt) {
    this.#player.update(dt);
    this.#objects.forEach((obj) => obj.update(dt));
    this.#cameraMng.updatePlayerMat(this.#player.posDirMatrix);

    this.#uiMng.update(
      this.#player,
      this.#lightMng,
      this.#cameraMng,
      this.#renderer,
    );
  }

  #draw() {
    this.#renderer.draw(
      this.#cameraMng.current,
      this.#lightMng,
      this.#materialMng,
      this.#player,
      this.#objects,
    );
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