import { AdvancedShape, Debug, LinesFromTriangles, Mat4, Icosahedron, Shape, Texture, toRad, Vec3, Vec4, MatrixStack, Colors } from "webgl-basic-lib";
import { CreateProgramFromData, ENV, PROGRAMS, SingleColorTexture, TemporaryTexture } from "../graphics/shaders.js";
import { OBJGraph } from "../utils/model_loader.js";

var loading_obj = null;
var static_obj = null;

const LIGHT_COLOR = new Vec3(214, 210, 159).div(255.0);

export class StreetLamp {
  #ctx = null;
  #stack = new MatrixStack();
  #lightMng = null;

  #mat = null;
  #programs = {
    body: null,
    lights: null,
  };
  #tex = {
    body: null,
    lights: null,
  };
  #col = {
    body: null,
    lights: null,
  };

  get lightPos() { return this.#mat.col(3).toVec3().add(new Vec3(0, 1.25, 0)); }
  get lightCol() { return LIGHT_COLOR; }

  constructor(gl, lightMng, at) {
    this.#ctx = gl;
    this.#lightMng = lightMng;
    this.#generate(at);
    this.#loadAsync();
    this.#lightMng.addPL(this.lightPos, this.lightCol);
  }

  #generate(at) {
    const gl = this.#ctx;

    this.#tex.body = SingleColorTexture(gl, [0x20, 0x20, 0x20, 0xff]);
    this.#programs.body = CreateProgramFromData(gl, PROGRAMS.LIGHTED);
    this.#col.lights = LIGHT_COLOR;
    this.#programs.lights = CreateProgramFromData(gl, PROGRAMS.COLORED);

    this.#mat = Mat4.Identity().translate(at).scale(Vec3.All(0.125));
  }

  #loadAsync() {
    const gl = this.#ctx;

    if (static_obj || loading_obj) return;
    loading_obj = true;

    fetch("assets/environment/lamp/lamp.obj")
      .then(async (resp) => {
        // console.log(resp);
        const text = await resp.text();
        const obj = OBJGraph.FromText(gl, text, true);
        console.log(obj);
        Object.values(obj.meshes).forEach((mesh) => { mesh.mat = Mat4.Identity(); });
        static_obj = obj;
        loading_obj = false;
      });
  }

  #drawBody(camera) {
    const gl = this.#ctx;

    this.#stack.push(this.#mat);
    this.#programs.body.use();
    
    this.#programs.body.uModel.update(this.#mat.values);
    this.#programs.body.uViewProj.update(camera.viewproj.values);
    this.#programs.body.uViewPos.update(camera.viewpos.values);
    this.#programs.body.uTexture.update(0);

    this.#lightMng.updateUniforms(this.#programs.body);
    
    this.#tex.body.bind(0);

    gl.bindBuffer(gl.ARRAY_BUFFER, static_obj.buff);
    this.#programs.body.enableAttributes();
    [static_obj.meshes.lamp]
      .forEach((mesh) => {
        const curr = this.#stack.push(mesh.mat);
        this.#programs.body.uModel.update(curr.values);
        gl.drawArrays(gl.TRIANGLES, mesh.startIndexVertexRawBuffer, mesh.numVertexes);
        this.#stack.pop(); // Mesh
      });
    this.#programs.body.disableAttributes();
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    this.#tex.body.unbind();
    this.#programs.body.unbind();
    this.#stack.pop();
  }

  #drawLights(camera) {
    if (this.#lightMng.pointLightsOff) return;
    const gl = this.#ctx;

    this.#stack.push(camera.viewproj);
    this.#stack.push(this.#mat);
    this.#programs.lights.use();
    this.#programs.lights.uColor.update(this.#col.lights.values)

    gl.bindBuffer(gl.ARRAY_BUFFER, static_obj.buff);
    this.#programs.lights.enableAttributes();
    [static_obj.meshes["lamp.001"]]
      .forEach((mesh) => {
        const curr = this.#stack.push(mesh.mat);
        this.#programs.lights.uMatrix.update(curr.values);
        gl.drawArrays(gl.TRIANGLES, mesh.startIndexVertexRawBuffer, mesh.numVertexes);
        this.#stack.pop(); // Mesh
      });
    this.#programs.lights.disableAttributes();
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    this.#programs.lights.unbind();
    this.#stack.pop();
    this.#stack.pop();
  }

  draw(camera, _) {
    const gl = this.#ctx;
    if (!static_obj) return;

    gl.enable(gl.DEPTH_TEST);
    
    {
      // Body
      this.#drawBody(camera);

      // Lights
      this.#drawLights(camera);
    }

    // DEBUG
    {
      this.#stack.push(camera.viewproj);
      this.#stack.push(this.#mat);
      static_obj.meshesArray
        .forEach((mesh) => {
          const curr = this.#stack.push(mesh.mat);
          static_obj.drawPoints(mesh, curr, new Vec4(1, 0, 0, 1), 5.0);
          static_obj.drawLines(mesh, curr, new Vec4(1, 1, 1, 1));
          this.#stack.pop(); // Mesh
        });
      this.#stack.pop();
      this.#stack.pop();
    }

    gl.disable(gl.DEPTH_TEST);
  }
}
