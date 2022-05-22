import { Mat4, Vec3 } from "webgl-basic-lib";
import { OnObjCreated, OnObjLoaded } from "../managers/ui_mng.js";
import { OBJGraph } from "../utils/obj_loader.js";
import { NUM_TILE } from "./terrain.js";

const sz = NUM_TILE / 2;
const ss = 2;
const ssh = ss / 2;

const STREET_OBJ = `
mtllib street.mtl

o plain

v -${ssh} 0 -${sz}
v -${ssh} 0 ${sz}
v ${ssh} 0 ${sz}
v ${ssh} 0 -${sz}

v -${ssh} 0 ${9}
v -${ssh} 0 ${9 - ss}
v -${sz} 0 ${9 - ss}
v -${sz} 0 ${9}

v ${ssh} 0 ${-9}
v ${ssh} 0 ${-9 - ss}
v ${sz} 0 ${-9 - ss}
v ${sz} 0 ${-9}

vt 0 0
vt 0 ${sz}
vt ${1} ${sz}
vt ${1} 0

vt 0 0
vt 0 ${ss / 2}
vt ${(sz - ssh) / 2} ${ss / 2}
vt ${(sz - ssh) / 2} 0

vt 0 0
vt 0 ${ss / 2}
vt ${(sz - ssh) / 2} ${ss / 2}
vt ${(sz - ssh) / 2} 0

vn 0 1 0

usemtl terrainAsphalt

f 1/1/1 2/2/1 3/3/1 4/4/1
f 5/5/1 6/6/1 7/7/1 8/8/1
f 9/9/1 10/10/1 11/11/1 12/12/1
`;

export class Street {
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
    this.#mat = Mat4.Identity().translate(new Vec3(0, 0.01, 0));
    this.#obj = OBJGraph.FromText(gl, STREET_OBJ, false);
    // console.log("Street", this.#obj);
    OnObjLoaded(this.obj);
  }

  update(dt) {

  }
}
