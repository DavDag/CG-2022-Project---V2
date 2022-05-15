import { AdvancedShape, Debug, LinesFromTriangles, Mat4, Quad, Shape, Texture, toRad, Vec3, Vec4 } from "webgl-basic-lib";
import { CreateProgramFromData, ENV, PROGRAMS, TemporaryTexture } from "../graphics/shaders.js";

export class Terrain {
  #ctx = null;
  #lightMng = null;

  #mesh = null;
  #buff = null;
  #mat = null;
  #program = null;
  #tex = null;

  constructor(gl, lightMng) {
    this.#ctx = gl;
    this.#lightMng = lightMng;
    this.#generate();
    this.#loadAsync();
  }

  #generate() {
    const gl = this.#ctx;

    this.#tex = TemporaryTexture(gl);
    this.#program = CreateProgramFromData(gl, PROGRAMS.LIGHTED);

    const quad = Quad._build();
    quad.uvs.map((v) => v.mul(25));
    this.#mesh = new AdvancedShape("Terrain", quad.vertexes, quad.uvs, quad.normals, quad.triangles);
    this.#mesh.lines = LinesFromTriangles(quad.vertexes, quad.triangles);
    this.#mesh.lines = new Uint16Array(Shape.FlattenVecArray(this.#mesh.lines));
    this.#mesh.numLines = this.#mesh.lines.length / 2;
    
    this.#buff = this.#mesh.createBuffers(gl);
    this.#mat = Mat4.Identity()
        .rotate(toRad(90), new Vec3(1, 0, 0))
        .scale(new Vec3(100, 100, 1));
  }

  #loadAsync() {
    const gl = this.#ctx;

    const configs = {
      target: gl.TEXTURE_2D,
      level: 0,
      format: gl.RGB,
      type: gl.UNSIGNED_BYTE,
      wrap: gl.REPEAT,
      filter: {mag: gl.LINEAR, min: gl.LINEAR_MIPMAP_LINEAR},
      genMipMap: true,
    }

    Texture
      .FromUrl(gl, "assets/environment/terrain/dirt/Ground_Dirt_005_COLOR.jpg", configs)
      .then((tex) => this.#tex = tex);
  }

  draw(camera, stack) {
    const gl = this.#ctx;

    const curr = stack.push(this.#mat);

    {
      this.#program.use();
      
      this.#program.uModel.update(this.#mat.values);
      this.#program.uViewProj.update(camera.viewproj.values);
      this.#program.uViewPos.update(camera.viewpos.values);
      this.#program.uTexture.update(0);
  
      this.#lightMng.updateUniforms(this.#program);
      
      this.#tex.bind(0);
    
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#buff.vertbuff);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#buff.indibuff);
      this.#program.enableAttributes();
      gl.drawElements(gl.TRIANGLES, this.#buff.numindi, gl.UNSIGNED_SHORT, 0);
      this.#program.disableAttributes();
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      
      this.#tex.unbind();
      this.#program.unbind();
    }

    stack.pop();

    gl.enable(gl.DEPTH_TEST);
    Debug.drawPoints(this.#mesh.vertexes, this.#mesh.vertexSize(), curr, 0, this.#mesh.numVertexes, new Vec4(1, 0, 0, 1), 5.0);
    Debug.drawLines(this.#mesh.vertexes, this.#mesh.lines, this.#mesh.vertexSize(), curr, 0, this.#mesh.numLines, new Vec4(1, 1, 1, 1));
    gl.disable(gl.DEPTH_TEST);
  }
}
