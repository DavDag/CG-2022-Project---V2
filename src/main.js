/** @author: Davide Risaliti davdag24@gmail.com */

import { DLight, LightManager } from "./managers/light_mng.js";
import { UIManager } from "./managers/ui_mng.js";
import { CameraManager } from "./managers/camera_mng.js";
import { Renderer } from "./rendering/renderer.js";
import { Player } from "./objects/player.js";
import { UpdateFps } from "./utils/fps_counter.js";
import { NUM_TILE, Terrain } from "./objects/terrain.js";
import { Debug, Vec2, Vec3 } from "webgl-basic-lib";
import { MaterialsManager } from "./managers/material_mng.js";
import { StreetLamp } from "./objects/street_lamp.js";
import { Building, B_TYPE_COMMERCIAL, B_TYPE_SUBURB } from "./objects/building.js";
import { Street } from "./objects/street.js";
import { Grass } from "./objects/grass.js";
import { Tree } from "./objects/tree.js";
  
function addBuildings(typ, arr, off, rot, right, data) {
  const acc = Vec3.Zeros().add(off);
  const f = (right) ? -1 : 1;
  data.forEach((v) => {
    const [id, sz] = v;
    arr.push(new Building(
      typ,
      id, sz,
      acc.clone().add(new Vec3(f * sz / 2, 0, - f * sz / 2)),
      rot
    ));
    acc.x += f * sz;
  });
}

function CreateTile() {
  const objects = [];
  
  objects.push(new Terrain());
  objects.push(new Street());
  objects.push(new Grass(new Vec2(20, 20), new Vec2(19, 29), true));
  objects.push(new Grass(new Vec2(-1, 0), new Vec2(19, 20), true));
  objects.push(new Tree(0, new Vec3(10, 0, 10)));
  objects.push(new Tree(1, new Vec3(11, 0, 11)));

  // "City"
  addBuildings(B_TYPE_COMMERCIAL, objects, new Vec3(-1, 0, 9), 0, true, [[4, 4], [1, 3], [2, 4], [3, 5], [5, 3],]);
  addBuildings(B_TYPE_COMMERCIAL, objects, new Vec3(-1, 0, 13), 270, true, [[2, 3]]);
  addBuildings(B_TYPE_COMMERCIAL, objects, new Vec3(-1, 0, 16), 270, true, [[5, 4]]);
  addBuildings(B_TYPE_COMMERCIAL, objects, new Vec3(-5, 0, 14), 0, true, [[5, 6], [0, 4], [1, 5]]);

  // "Outskirt"
  addBuildings(B_TYPE_SUBURB, objects, new Vec3(1, 0, -12), 90, false, [[2, 4]]);
  addBuildings(B_TYPE_SUBURB, objects, new Vec3(1, 0, -16), 90, false, [[0, 4]]);
  addBuildings(B_TYPE_SUBURB, objects, new Vec3(10, 0, -12), 180, false, [[3, 5], [3, 5]]);
  addBuildings(B_TYPE_SUBURB, objects, new Vec3(10, 0, -8), 0, true, [[1, 4]]);
  addBuildings(B_TYPE_SUBURB, objects, new Vec3(-1, 0, -10), 270, true, [[4, 4]]);

  return objects;
}

export class App {
  #ctx = null;

  #uiMng = null;
  #lightMng = null;
  #cameraMng = null;
  #materialMng = null;

  hideBuildings = false;
  hideCars = false;

  #renderer = null;
  #player = new Player();
  #objects = [
    ... CreateTile(),
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
        this.hideBuildings = !this.hideBuildings;
        this.#objects.filter((obj) => obj instanceof Building).forEach((obj) => obj.obj.hide = this.hideBuildings);
        break;
      }
      case "3": {
        this.hideCars = !this.hideCars;
        // this.#objects.filter((obj) => obj instanceof Car).forEach((obj) => obj.obj.hide = this.hideCars);
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

    this.#player.setup(gl, this.#lightMng);
    this.#objects.forEach((obj) => obj.setup(gl, this.#lightMng));

    this.#lightMng.addDL(true, new DLight(
      new Vec3(1, -1, 1).normalize(),
      new Vec3(1, 1, 1),
      {amb: 0.5, dif: 0.8, spe: 0.1}
    ));
  }

  #update(dt) {
    this.#player.update(dt);
    this.#objects.forEach((obj) => obj.update(dt));
    this.#cameraMng.updatePlayerMat(this.#player.posDirMatrix);

    this.#uiMng.update(
      this,
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