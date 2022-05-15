
export class LightManager {
  #ctx = null;

  #DL = null;
  #PL = [];
  #SL = [];

  show = false;

  dirLightsOff = false;
  pointLightsOff = false;
  spotLightsOff = false;

  constructor(gl) {
    this.#ctx = gl;
  }

  addDL(dir) {
  }

  addPL(pos, col, props) {
  }

  addSL(pos, dir, col, props) {
  }
}
