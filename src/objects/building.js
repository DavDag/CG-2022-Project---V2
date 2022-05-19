import { Mat4, toRad, Vec3, Vec4 } from "webgl-basic-lib";
import { OBJGraph } from "../utils/obj_loader.js";

export const B_TYPE_COMMERCIAL = 0;
export const B_TYPE_SUBURB = 1;

const PROPS = {
  [B_TYPE_COMMERCIAL]: {
    scale: 0.75,
  },
  [B_TYPE_SUBURB]: {
    scale: 1.0,
  }
};

const VARIANTS = {
  [B_TYPE_COMMERCIAL]: [
    "skyscraperA.obj",
    "skyscraperB.obj",
    "skyscraperC.obj",
    "skyscraperD.obj",
    "skyscraperE.obj",
    "skyscraperF.obj",
  ],
  [B_TYPE_SUBURB]: [
    "small_buildingA.obj",
    "small_buildingB.obj",
    "small_buildingC.obj",
    "small_buildingD.obj",
    "small_buildingE.obj",
    "small_buildingF.obj",
  ],
};

var __static_obj = {
  [B_TYPE_COMMERCIAL]: new Array(VARIANTS[B_TYPE_COMMERCIAL].length).fill(null).map((_) => ({
    obj: null,
    loading: false,
  })),
  [B_TYPE_SUBURB]: new Array(VARIANTS[B_TYPE_SUBURB].length).fill(null).map((_) => ({
    obj: null,
    loading: false,
  })),
};

export class Building {
  #ctx = null;
  #objRef = null;

  #type = null;
  #ind = null;
  #size = null;
  #pos = null;
  #rot = null;

  #cachedMat = null;

  get obj() { return this.#objRef.obj; }
  get matrix() { return this.#cachedMat; }

  constructor(type, ind, size, pos, rot) {
    this.#type = type;
    this.#ind = ind % VARIANTS[this.#type].length;
    this.#size = size;
    this.#pos = pos;
    this.#rot = rot;
    this.#objRef = __static_obj[this.#type][this.#ind];
    this.#update();
  }

  #update() {
    this.#cachedMat = Mat4.Identity()
      .translate(this.#pos)
      .rotate(toRad(this.#rot), new Vec3(0, 1, 0))
      .scale(Vec3.All(this.#size))
      .scale(Vec3.All(PROPS[this.#type].scale))
    ;
  }
  
  setup(gl, light_mng) {
    this.#ctx = gl;
    this.#loadAsync();
  }

  #loadAsync() {
    const gl = this.#ctx;

    if (this.#objRef.obj || this.#objRef.loading) return;
    this.#objRef.loading = true;

    fetch("assets/buildings/" + VARIANTS[this.#type][this.#ind])
      .then(async (resp) => {
        const text = await resp.text();
        this.#objRef.obj = OBJGraph.FromText(gl, text, false);
        this.#objRef.loading = false;
        // console.log("Building", this.#objRef.obj);
      });
  }

  update(dt) {

  }
}
