import { Mat4, toRad, Vec3 } from "webgl-basic-lib";
import { OBJGraph } from "../utils/obj_loader.js";

var __loading_static_obj = false;
var __static_obj = null;

export class StreetLamp {
  #ctx = null;
  #mat = null;
  #pos = null;
  #rot = null;

  get obj() { return __static_obj; }
  get matrix() { return this.#mat; }

  constructor(pos, rot) {
    this.#pos = pos;
    this.#rot = rot;
    this.#mat = Mat4.Identity().translate(this.#pos).rotate(toRad(this.#rot), new Vec3(0, 1, 0));

    
  }
  
  setup(gl) {
    this.#ctx = gl;
    this.#loadAsync();
  }

  #loadAsync() {
    const gl = this.#ctx;

    if (__static_obj || __loading_static_obj) return;
    __loading_static_obj = true;

    fetch("assets/environment/detailLight_single.obj")
      .then(async (resp) => {
        const text = await resp.text();
        __static_obj = OBJGraph.FromText(gl, text, false);
        __loading_static_obj = false;
        console.log("StreetLamp", __static_obj);
      });
  }

  update(dt) {

  }
}
