import { Mat4, toRad, Vec3 } from "webgl-basic-lib";
import { OnObjCreated, OnObjLoaded } from "../managers/ui_mng.js";
import { OBJGraph } from "../utils/obj_loader.js";

var __loading_static_obj = false;
var __static_obj = null;

export class Fence {
  #ctx = null;

  #pos = null;
  #rot = null;
  #cachedMat = null;

  tag = "ENVIRONMENT";
  hide = false;

  get obj() { return __static_obj; }
  get matrix() { return this.#cachedMat; }

  constructor(pos, rot) {
    this.#pos = pos;
    this.#rot = rot;
    this.#update();
    OnObjCreated(this);
  }

  #update() {
    this.#cachedMat = Mat4.Identity()
      .translate(this.#pos)
      .rotate(toRad(this.#rot), new Vec3(0, 1, 0))
      .scale(new Vec3(0.5, 0.5, 0.5))
    ;
  }
  
  setup(gl, light_mng) {
    this.#ctx = gl;
    this.#loadAsync();
  }

  #loadAsync() {
    const gl = this.#ctx;

    if (__static_obj || __loading_static_obj) return;
    __loading_static_obj = true;

    fetch("assets/environment/fenceFortified.obj")
      .then(async (resp) => {
        const text = await resp.text();
        __static_obj = OBJGraph.FromText(gl, text, false);
        __loading_static_obj = false;
        // console.log("Fence", __static_obj);
        OnObjLoaded(this.obj);
      });
  }

  update(dt) {

  }
}
