import { Mat4, toRad, Vec3 } from "webgl-basic-lib";
import { OnObjCreated, OnObjLoaded } from "../managers/ui_mng.js";
import { OBJGraph } from "../utils/obj_loader.js";

const VARIANTS = [
  "cake.obj",
  "burgerCheese.obj",
];

var __loading_static_obj = new Array(VARIANTS.length).fill(false);
var __static_obj = new Array(VARIANTS.length).fill(null);

export class PicNic {
  #ctx = null;

  #ind = null;
  #pos = null;
  #rot = null;
  #cachedMat = null;

  tag = "ENVIRONMENT";
  hide = false;

  get obj() { return __static_obj[this.#ind]; }
  get matrix() { return this.#cachedMat; }

  constructor(ind, pos, rot) {
    this.#ind = ind % VARIANTS.length;
    this.#pos = pos;
    this.#rot = rot;
    this.#update();
    OnObjCreated(this);
  }

  #update() {
    this.#cachedMat = Mat4.Identity()
      .translate(this.#pos)
      .rotate(toRad(this.#rot), new Vec3(0, 1, 0))
      .scale(Vec3.All(5.0))
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
        // console.log("Picnic", __static_obj[this.#ind]);
        OnObjLoaded(this.obj);
      });
  }

  update(dt) {

  }
}
