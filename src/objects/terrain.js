import { Mat4, Quad, toRad, Vec3 } from "webgl-basic-lib";
import { OBJGraph } from "../utils/obj_loader.js";

const NUM_TILE = 10;

const TERRAIN_OBJ = `
mtllib terrain.mtl

o plain

v -1 -1 0
v -1 1 0
v 1 1 0
v 1 -1 0

vt 0 0
vt 0 ${NUM_TILE}
vt ${NUM_TILE} ${NUM_TILE}
vt ${NUM_TILE} 0

vn 0 0 1

usemtl asphalt

f 1/1/1 2/2/1 3/3/1 4/4/1
`;

export class Terrain {
  #ctx = null;
  #mat = null;
  #obj = null;

  get obj() { return this.#obj; }
  get matrix() { return this.#mat; }
  
  setup(gl) {
    this.#ctx = gl;
    this.#mat = Mat4.Identity().rotate(toRad(90), new Vec3(1, 0, 0)).scale(Vec3.All(NUM_TILE));
    this.#obj = OBJGraph.FromText(gl, TERRAIN_OBJ, false);
    console.log("Terrain", this.#obj);
  }

  update(dt) {

  }
}
