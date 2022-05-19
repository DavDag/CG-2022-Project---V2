import { Debug } from "webgl-basic-lib";
import { FPS } from "../utils/fps_counter.js";

export class UIManager {
  #ctx = null;
  #docRef = {};
  #showExtFunctions = false;

  get showExtFunctions() { return this.#showExtFunctions; }
  set showExtFunctions(value) {
    for (const v of this.#docRef.extraFunctions) { v.hidden = !value; }
    this.#showExtFunctions = value;
  }

  constructor(gl) {
    this.#ctx = gl;
    this.#loadFromDocument();
  }

  #loadFromDocument() {
    this.#docRef = {
      extraFunctions: document.getElementsByClassName("extraFunctions"),

      fpsCounter: document.getElementById("fpsCounter"),

      accMeter: document.getElementById("accMeter"),
      speedMeter: document.getElementById("speedMeter"),

      debugMeshes: document.getElementById("debugMeshes"),
      aaMethod: document.getElementById("aaMethod"),
      showBuildings: document.getElementById("showBuildings"),
      showCars: document.getElementById("showCars"),
      partResults: document.getElementById("partResults"),

      dirLights: document.getElementById("dirLights"),
      pointLights: document.getElementById("pointLights"),
      spotLights: document.getElementById("spotLights"),
      showLightsPos: document.getElementById("showLightsPos"),

      cameraName: document.getElementById("cameraName"),
      forceFollow: document.getElementById("forceFollow"),
    }
  }

  update(
    app,
    player,
    lightMng,
    cameraMng,
    renderer,
  ) {
    // General
    this.#docRef.fpsCounter.innerText = Math.abs(FPS).toFixed(1);
    
    // Player
    const controller = player.controller;
    this.#docRef.accMeter.innerText = Math.abs(controller.acceleration).toFixed(1);
    this.#docRef.speedMeter.innerText = Math.abs(controller.speed).toFixed(1);
    
    // Lights
    this.#docRef.dirLights.innerText = (!lightMng.dirLightsOff) ? "On" : "Off";
    this.#docRef.pointLights.innerText = (!lightMng.pointLightsOff) ? "On" : "Off";
    this.#docRef.spotLights.innerText = (!lightMng.spotLightsOff) ? "On" : "Off";
    this.#docRef.showLightsPos.innerText = (lightMng.show) ? "On" : "Off";
    
    // Meshes
    this.#docRef.debugMeshes.innerText = (Debug.isActive) ? "On" : "Off";
    this.#docRef.showBuildings.innerText = (!app.hideBuildings) ? "On" : "Off";
    this.#docRef.showCars.innerText = (!app.hideCars) ? "On" : "Off";

    // Debug
    this.#docRef.cameraName.innerText = cameraMng.current.name;
    this.#docRef.forceFollow.innerText = ["Camera-def", "Force-Follow", "Force-Un-Follow"][cameraMng.forceFollowPlayer];

    // Rendering
    this.#docRef.partResults.innerText = (renderer.showPartialResults) ? "On" : "Off";
  }
}
