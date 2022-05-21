import { Mat4, toRad, Vec3, Vec4 } from "webgl-basic-lib";
import { PLight, SLight } from "../managers/light_mng.js";
import { OnObjCreated, OnObjLoaded } from "../managers/ui_mng.js";
import { OBJGraph } from "../utils/obj_loader.js";

var __loading_static_obj = false;
var __static_obj = null;

export class StreetLamp {
  #ctx = null;

  #pos = null;
  #rot = null;
  #lightPos = new Vec4(0, 0.9, -0.20, 1);

  #cachedMat = null;
  #cachedLightPos = null;

  tag = "ENVIRONMENT";
  hide = false;

  get obj() { return __static_obj; }
  get matrix() { return this.#cachedMat; }
  get lightDir() { return new Vec3(0, -1, 0); }
  get lightPos() { return this.#cachedLightPos; }
  get lightCol() { return new Vec3(1, 1, 1); }

  constructor(pos, rot) {
    this.#pos = pos;
    this.#rot = rot;
    this.#update();
    OnObjCreated(this);
  }

  #update() {
    this.#cachedMat = Mat4.Identity()
      .scale(new Vec3(1, 1.5, 1))
      .translate(this.#pos)
      .rotate(toRad(this.#rot), new Vec3(0, 1, 0))
    ;
    this.#cachedLightPos = this.#lightPos.transform(this.#cachedMat).toVec3();
  }
  
  setup(gl, light_mng) {
    this.#ctx = gl;
    this.#loadAsync();

    light_mng.addSL(false, new SLight(
      this.lightDir,
      this.lightPos,
      this.lightCol,
      {amb: 0.00, dif: 1.0, spe: 0.5},
      {lin: 0.4, qua: 0.2},
      Math.cos(toRad(50)),
      Math.cos(toRad(70)),
    ));
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
        // console.log("StreetLamp", __static_obj);
        OnObjLoaded(this.obj);
      });
  }

  update(dt) {

  }
}
