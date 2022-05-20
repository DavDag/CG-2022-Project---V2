import { Debug } from "webgl-basic-lib";
import { FPS } from "../utils/fps_counter.js";

const global_data_counter = {
  objs: [],
  totVert: function() {
    var result = 0;
    this.objs.forEach((o) => {
      if (!o.obj || o.hide) return;
      const tot = (o.obj.rawVertexesData.length / 8.0);
      result += tot;
    });
    return result;
  },
};

export function OnObjCreated(obj) {
  // console.log(obj);
  global_data_counter.objs.push(obj);
}

export function OnObjLoaded(obj) {
  // console.log(obj.name);
}

const ON = "<span style=\"color:#0F0\">ON</span>";
const OFF = "<span style=\"color:#F00\">OFF</span>";
const CUSTOM = (txt) => ("<span style=\"color:#0FF\">" + txt + "</span>");

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
    const gl = this.#ctx;

    this.#docRef = {
      extraFunctions: document.getElementsByClassName("extraFunctions"),

      canvasSize: document.getElementById("canvasSize"),
      fpsCounter: document.getElementById("fpsCounter"),

      accMeter: document.getElementById("accMeter"),
      speedMeter: document.getElementById("speedMeter"),

      debugMeshes: document.getElementById("debugMeshes"),
      aaMethod: document.getElementById("aaMethod"),
      showBuildings: document.getElementById("showBuildings"),
      showCars: document.getElementById("showCars"),
      showEnvironment: document.getElementById("showEnvironment"),
      showPlayer: document.getElementById("showPlayer"),

      partResults: document.getElementById("partResults"),
      aaSampleMethod: document.getElementById("aaSampleMethod"),

      dirLights: document.getElementById("dirLights"),
      pointLights: document.getElementById("pointLights"),
      spotLights: document.getElementById("spotLights"),
      showLightsPos: document.getElementById("showLightsPos"),
      isDay: document.getElementById("isDay"),
      ssaoResults: document.getElementById("ssaoResults"),

      cameraName: document.getElementById("cameraName"),
      forceFollow: document.getElementById("forceFollow"),
      
      vendor: document.getElementById("vendor"),
      renderer: document.getElementById("renderer"),
      totVertexCount: document.getElementById("totVertexCount"),
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    this.#docRef.vendor.innerHTML = CUSTOM(vendor);
    this.#docRef.renderer.innerHTML = CUSTOM(renderer);
  }

  #update(
    forceAll,
    app,
    player,
    lightMng,
    cameraMng,
    renderer,
  ) {
    const gl = this.#ctx;

    // General
    this.#docRef.fpsCounter.innerHTML = Math.abs(FPS).toFixed(1);
    
    // Player
    const controller = player.controller;
    this.#docRef.accMeter.innerHTML = Math.abs(controller.acceleration).toFixed(1);
    this.#docRef.speedMeter.innerHTML = Math.abs(controller.speed).toFixed(1);

    if (forceAll) {
      // General
      this.#docRef.canvasSize.innerHTML = `${gl.canvasEl.width} x ${gl.canvasEl.height}`;
      this.#docRef.totVertexCount.innerHTML = CUSTOM(global_data_counter.totVert());
      
      // Lights
      this.#docRef.dirLights.innerHTML = (!lightMng.dirLightsOff) ? ON : OFF;
      this.#docRef.pointLights.innerHTML = (!lightMng.pointLightsOff) ? ON : OFF;
      this.#docRef.spotLights.innerHTML = (!lightMng.spotLightsOff) ? ON : OFF;
      this.#docRef.showLightsPos.innerHTML = (lightMng.show) ? ON : OFF;
      this.#docRef.isDay.innerHTML = CUSTOM((lightMng.isDay) ? "Day" : "Night");
      
      // Meshes
      this.#docRef.debugMeshes.innerHTML = (Debug.isActive) ? ON : OFF;
      this.#docRef.showBuildings.innerHTML = (!app.hideBuildings) ? ON : OFF;
      this.#docRef.showCars.innerHTML = (!app.hideCars) ? ON : OFF;
      this.#docRef.showEnvironment.innerHTML = (!app.hideEnvironment) ? ON : OFF;
      this.#docRef.showPlayer.innerHTML = (!app.hidePlayer) ? ON : OFF;
  
      // Debug
      this.#docRef.cameraName.innerHTML = CUSTOM(cameraMng.current.name);
      this.#docRef.forceFollow.innerHTML = CUSTOM(["Camera-def", "Force-Follow", "Force-Un-Follow"][cameraMng.forceFollowPlayer]);
  
      // Rendering
      this.#docRef.partResults.innerHTML = (renderer.showPartialResults) ? ON : OFF;
      this.#docRef.aaSampleMethod.innerHTML = CUSTOM((renderer.aaSamples == 0) ? "None" : "Native x" + renderer.aaSamples);
      this.#docRef.ssaoResults.innerHTML = (renderer.showOccResults) ? ON : OFF;
    }
  }

  updateRequested(
    app,
    player,
    lightMng,
    cameraMng,
    renderer,
  ) {
    this.#update(true, app, player, lightMng, cameraMng, renderer);
  }

  updateRealTime(
    app,
    player,
    lightMng,
    cameraMng,
    renderer,
  ) {
    this.#update(false, app, player, lightMng, cameraMng, renderer);
  }
}
