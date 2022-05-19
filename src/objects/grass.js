import { Mat4, Vec3 } from "webgl-basic-lib";
import { OnObjCreated, OnObjLoaded } from "../managers/ui_mng.js";
import { OBJGraph } from "../utils/obj_loader.js";

const GRASS_OBJ = (o, sz) => (`
mtllib grass.mtl

o plain

v 0 0 0
v 0 0 1
v 1 0 1
v 1 0 0

vt 0 0
vt 0 ${sz.h / 2}
vt ${sz.w / 2} ${sz.h / 2}
vt ${sz.w / 2} 0

vn 0 1 0

usemtl grass

f 1/1/1 2/2/1 3/3/1 4/4/1
`);

export class Grass {
  #ctx = null;
  #mat = null;
  #obj = null;

  #orig = null;
  #size = null;
  #reversed = null;

  tag = "TERRAIN";
  hide = false;

  get obj() { return this.#obj; }
  get matrix() { return this.#mat; }

  constructor(orig, size, reversed) {
    this.#orig = orig;
    this.#size = size;
    this.#reversed = reversed;
    OnObjCreated(this);
  }
  
  setup(gl, light_mng) {
    this.#ctx = gl;
    this.#mat = Mat4.Identity()
      .translate(new Vec3(this.#orig.x, 0, this.#orig.y))
      .translate(new Vec3(this.#size.w, 0, this.#size.h).mul((this.#reversed) ? -1 : 0))
      .scale(new Vec3(this.#size.w, 1, this.#size.h))
      .translate(new Vec3(0, 0.01, 0))
      ;
    this.#obj = OBJGraph.FromText(gl, GRASS_OBJ(this.#orig, this.#size), false);
    // console.log(`Grass: ${this.#orig.toString(0)} ${this.#size.w}x${this.#size.h}`, this.#obj);
    OnObjLoaded(this.obj);
  }

  update(dt) {

  }
}
