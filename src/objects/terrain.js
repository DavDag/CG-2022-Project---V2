import { Mat4, Vec3 } from "webgl-basic-lib";
import { OnObjCreated, OnObjLoaded } from "../managers/ui_mng.js";
import { OBJGraph } from "../utils/obj_loader.js";

export const NUM_TILE = 40;

const TERRAIN_OBJ = `
mtllib terrain.mtl

o plain

v -0.5 0 -0.5
v -0.5 0 0.5
v 0.5 0 0.5
v 0.5 0 -0.5

vt 0 0
vt 0 ${NUM_TILE}
vt ${NUM_TILE} ${NUM_TILE}
vt ${NUM_TILE} 0

vn 0 1 0

usemtl terrain

f 1/1/1 2/2/1 3/3/1 4/4/1
`;

export class Terrain {
  #ctx = null;
  #mat = null;
  #obj = null;

  tag = "TERRAIN";
  hide = false;

  get obj() { return this.#obj; }
  get matrix() { return this.#mat; }

  constructor() {
    OnObjCreated(this);
  }
  
  setup(gl, light_mng) {
    this.#ctx = gl;
    this.#mat = Mat4.Identity().scale(Vec3.All(NUM_TILE));
    this.#obj = OBJGraph.FromText(gl, TERRAIN_OBJ, false);
    // console.log("Terrain", this.#obj);
    OnObjLoaded(this.obj);
  }

  update(dt) {

  }
}
