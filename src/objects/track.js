import { AdvancedShape, Cube, Debug, LinesFromTriangles, Mat4, Quad, Shape, Texture, toRad, Vec2, Vec3, Vec4 } from "webgl-basic-lib";
import { CreateProgramFromData, ENV, PROGRAMS, TemporaryTexture } from "../graphics/shaders.js";


export class Track {
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
  }

  #loadFromText(name, text) {
    const gl = this.#ctx;

    const vertexes = [];
    const uvs = [];
    const normals = [];
    const triangles = [];

    const s = 0.25;
    const e = 0.5;

    const pattern = {

      "CROSS": {
        name: "Cross Track Tile",
        vertexes: [
          new Vec3(-s,  s, 0),
          new Vec3(-s, -s, 0),
          new Vec3( e, -s, 0),
          new Vec3( e,  s, 0),

          new Vec3(-s, -s, 0),
          new Vec3(-s, -e, 0),
          new Vec3( s, -e, 0),
          new Vec3( s, -s, 0),

          new Vec3(-s, -s, 0),
          new Vec3(-s,  s, 0),
          new Vec3(-e,  s, 0),
          new Vec3(-e, -s, 0),

          new Vec3( s,  s, 0),
          new Vec3( s,  e, 0),
          new Vec3(-s,  e, 0),
          new Vec3(-s,  s, 0),
        ],
        triangles: [
          new Vec3(0, 1, 2), new Vec3(0, 2, 3),
          new Vec3(4, 5, 6), new Vec3(4, 6, 7),
          new Vec3(8, 9, 10), new Vec3(8, 10, 11),
          new Vec3(12, 13, 14), new Vec3(12, 14, 15)
        ],
      },

      "STRAIGHT": {
        name: "Straight Track Tile",
        vertexes: [new Vec3(-s, 0.5, 0), new Vec3(-s, -0.5, 0), new Vec3(s, -0.5, 0), new Vec3(s, 0.5, 0)],
        triangles: [new Vec3(0, 1, 2), new Vec3(0, 2, 3)],
      },
      
      "T": {
        name: "T-Shaped Track Tile",
        vertexes: [
          new Vec3(-e,  s, 0),
          new Vec3(-e, -s, 0),
          new Vec3( e, -s, 0),
          new Vec3( e,  s, 0),

          new Vec3(-s, -s, 0),
          new Vec3(-s, -e, 0),
          new Vec3( s, -e, 0),
          new Vec3( s, -s, 0),
        ],
        triangles: [new Vec3(0, 1, 2), new Vec3(0, 2, 3), new Vec3(4, 5, 6), new Vec3(4, 6, 7)],
      },

      "CURVE": {
        name: "Curve Track Tile",
        vertexes: [
          new Vec3(-s,  s, 0),
          new Vec3(-s, -s, 0),
          new Vec3( e, -s, 0),
          new Vec3( e,  s, 0),

          new Vec3(-s, -s, 0),
          new Vec3(-s, -e, 0),
          new Vec3( s, -e, 0),
          new Vec3( s, -s, 0),
        ],
        triangles: [new Vec3(0, 1, 2), new Vec3(0, 2, 3), new Vec3(4, 5, 6), new Vec3(4, 6, 7)],
      },
    };

    const ROT_0 = Mat4.Identity();
    const ROT_90 = Mat4.Identity().rotate(toRad(90), new Vec3(0, 0, 1));
    const ROT_180 = Mat4.Identity().rotate(toRad(180), new Vec3(0, 0, 1));
    const ROT_270 = Mat4.Identity().rotate(toRad(270), new Vec3(0, 0, 1));

    const retrieveTile = (hasTop, hasBot, hasLeft, hasRight) => {
      const key = ((hasTop) ? "T" : " ") + ((hasBot) ? "B" : " ") + ((hasLeft) ? "L" : " ") + ((hasRight) ? "R" : " ");
      const withMat = (ptt, mat) => ({ptt, mat});
      switch (key) {
        // CROSS
        case "TBLR": {
          return withMat(pattern.CROSS, ROT_0);
        }

        // STRAIGHT
        case "  LR": {
          return withMat(pattern.STRAIGHT, ROT_0);
        }
        case "TB  ": {
          return withMat(pattern.STRAIGHT, ROT_90);
        }

        // T
        case "TBL ": {
          return withMat(pattern.T, ROT_0);
        }
        case " BLR": {
          return withMat(pattern.T, ROT_90);
        }
        case "TB R": {
          return withMat(pattern.T, ROT_180);
        }
        case "T LR": {
          return withMat(pattern.T, ROT_270);
        }

        // CURVE
        case " BL ": {
          return withMat(pattern.CURVE, ROT_0);
        }
        case " B R": {
          return withMat(pattern.CURVE, ROT_90);
        }
        case "T  R": {
          return withMat(pattern.CURVE, ROT_180);
        }
        case "T L ": {
          return withMat(pattern.CURVE, ROT_270);
        }
        default: {
          return null;
        }
      }
    };

    const map = text.split("\r\n").map((line) => line.split("").slice(0, line.length));
    const maxRow = map.length;
    const maxCol = map[0].length;
    const mesh = Array(maxRow).fill(null).map(() => ([]));
    map.forEach((row, ri) => {
      row.forEach((c, ci) => {
        if (c == '.') {
          mesh[ri].push(null);
          return;
        }

        const hasTop = (ri > 0 && map[ri-1][ci] == '#');
        const hasBot = (ri < maxRow && map[ri+1][ci] == '#');
        const hasLeft = (ci > 0 && map[ri][ci-1] == '#');
        const hasRight = (ci < maxCol && map[ri][ci+1] == '#');

        const tile = retrieveTile(hasTop, hasBot, hasLeft, hasRight);
        mesh[ri].push(tile);
        if (!tile) return;

        const tmpMat = Mat4.Identity().translate(new Vec3(ri, ci, 0)).apply(tile.mat);
        const tmpVertexes = tile.ptt.vertexes.map((v) => {
          if (!v.toVec4) console.log(v);
          const vec = v.toVec4(1);
          vec.transform(tmpMat);
          // vec.div(vec.w);
          return vec.toVec3();
        });

        const numVert = Vec3.All(vertexes.length);

        vertexes.push(...tmpVertexes);
        uvs.push(...(tile.ptt.vertexes.map((v) => v.toVec2())));
        normals.push(...(tmpVertexes.map((_) => new Vec3(0, 0, -1))));
        triangles.push(...(tile.ptt.triangles.map((t) => t.clone().add(numVert))));
      });
    });
    console.log(mesh);

    const shape = new AdvancedShape("track_" + name, vertexes, uvs, normals, triangles);
    const lines = LinesFromTriangles(vertexes, triangles);
    shape.lines = new Uint16Array(Shape.FlattenVecArray(lines));
    shape.numLines = lines.length;

    console.log(shape);
    
    this.#mesh = shape;
    this.#buff = shape.createBuffers(gl);
    this.#mat = Mat4.Identity()
                      .rotate(toRad(90), new Vec3(1, 0, 0))
                      .scale(new Vec3(-5, -5, 1))
                      .translate(new Vec3(- maxRow / 2, - maxCol / 2, 0))
                      ;
  }

  #loadAsync() {
    const gl = this.#ctx;

    fetch("assets/environment/track/circuit_2.txt")
      .then(async (resp) => {
        // console.log(resp);
        const text = await resp.text();
        this.#loadFromText("circuit_1", text);
      });

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
      .FromUrl(gl, "assets/environment/track/asphalt/Asphalt_002_COLOR.jpg", configs)
      .then((tex) => this.#tex = tex);
  }

  draw(camera, stack) {
    const gl = this.#ctx;
    if (this.#mesh == null) return;

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
