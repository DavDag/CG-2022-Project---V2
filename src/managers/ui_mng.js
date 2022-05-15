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

      accIndicator: document.getElementById("accIndicator"),
      speedIndicator: document.getElementById("speedIndicator"),

      fpsIndicator: document.getElementById("fpsIndicator"),
      dirLightsIndicator: document.getElementById("dirLightsIndicator"),
      pointLightsIndicator: document.getElementById("pointLightsIndicator"),
      spotLightsIndicator: document.getElementById("spotLightsIndicator"),
    }
  }

  update() {
    // this.#docRef.accIndicator.innerText = Math.abs(controller.acceleration).toFixed(1);
    // this.#docRef.speedIndicator.innerText = Math.abs(controller.speed).toFixed(1);

    // this.#docRef.fpsIndicator.innerText = Math.abs(FPS).toFixed(1);

    // this.#docRef.dirLightsIndicator.innerText = (!lightMng.dirLightsOff) ? "On" : "Off";
    // this.#docRef.pointLightsIndicator.innerText = (!lightMng.pointLightsOff) ? "On" : "Off";
    // this.#docRef.spotLightsIndicator.innerText = (!lightMng.spotLightsOff) ? "On" : "Off";
  }
}
