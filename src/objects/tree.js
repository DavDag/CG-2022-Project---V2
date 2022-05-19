import { Mat4, toRad, Vec3, Vec4 } from "webgl-basic-lib";
import { PLight, SLight } from "../managers/light_mng.js";
import { OBJGraph } from "../utils/obj_loader.js";

const VARIANTS = [
  "tree.obj",
  "treeFall.obj",
];

var __loading_static_obj = new Array(VARIANTS.length).fill(false);
var __static_obj = new Array(VARIANTS.length).fill(null);

export class Tree {
  #ctx = null;

  #ind = null;
  #pos = null;
  #cachedMat = null;

  get obj() { return __static_obj[this.#ind]; }
  get matrix() { return this.#cachedMat; }

  constructor(ind, pos) {
    this.#ind = ind % VARIANTS.length;
    this.#pos = pos;
    this.#update();
  }

  #update() {
    this.#cachedMat = Mat4.Identity()
      .translate(this.#pos)
      .scale(new Vec3(0.5, 0.5, 0.5))
    ;
  }
  
  setup(gl, light_mng) {
    this.#ctx = gl;
    this.#loadAsync();
  }

  #loadAsync() {
    const gl = this.#ctx;

    if (__static_obj[this.#ind] || __loading_static_obj[this.#ind]) return;
    __loading_static_obj[this.#ind] = true;

    fetch("assets/environment/" + VARIANTS[this.#ind])
      .then(async (resp) => {
        const text = await resp.text();
        __static_obj[this.#ind] = OBJGraph.FromText(gl, text, false);
        __loading_static_obj[this.#ind] = false;
        console.log("Tree", __static_obj[this.#ind]);
      });
  }

  update(dt) {

  }
}
