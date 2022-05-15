// http://paulbourke.net/dataformats/obj/
// https://en.wikipedia.org/wiki/Wavefront_.obj_file

import { AdvancedShape, Debug, Shape, Vec2, Vec3 } from "webgl-basic-lib";
import { TemporaryTexture } from "../graphics/shaders.js";

export class OBJMaterial {
  // TODO
}

export class OBJMesh {
  triangles = [];
  positions = [];
  uvs = [];
  normals = [];
  startIndexVertexRawBuffer = -1;
  startIndexLinesRawBuffer = -1;
  vertexes = [];
  get numVertexes() { return this.vertexes.length; }
  get numLines() { return this.triangles.length * 3; }
}

export class OBJGraph {
  #ctx;
  name; // String
  materials; // Dict { OBJMaterial }
  meshes; // Dict { OBJMesh }
  get meshesArray() { return Object.values(this.meshes); }
  buff; // WebGLBuffer
  rawVertexes; // List
  lines; // List
  vertSize = 8;

  constructor(gl, name, materials, meshes) {
    this.#ctx = gl;
    this.name = name;
    this.materials = materials;
    this.meshes = meshes;
    this.buff = gl.createBuffer();
    this.rawVertexes = null;
    this.lines = null;

    this.#uploadData();
  }

  #uploadData() {
    const gl = this.#ctx;

    const all = [];
    this.meshesArray.map((mesh) => all.push(mesh.vertexes.flat()));
    
    this.rawVertexes = new Float32Array(all.flat());
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buff);
    gl.bufferData(gl.ARRAY_BUFFER, this.rawVertexes, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const tmp = [];
    this.meshesArray.forEach((mesh) => {
      mesh.startIndexLinesRawBuffer = tmp.length * 2;
      mesh.triangles.forEach((_) => {
        const size = tmp.length / 2;
        tmp.push(size + 0, size + 1);
        tmp.push(size + 1, size + 2);
        tmp.push(size + 2, size + 0);
      });
    });
    this.lines = new Int16Array(tmp);

    if (this.lines.length > 65000) console.error("Debug lines count exceeded UNSIGNED_SHORT (>65000).");
  }

  drawPoints(mesh, curr, color, size) {
    Debug.drawPoints(this.rawVertexes, this.vertSize, curr, mesh.startIndexVertexRawBuffer, mesh.numVertexes, color, size);
  }

  drawLines(mesh, curr, color) {
    Debug.drawLines(this.rawVertexes, this.lines, this.vertSize, curr, mesh.startIndexLinesRawBuffer, mesh.numLines, color);
  }

  static FromText(gl, text, mute) {
    // Data to load
    const meshes = {};
    const materials = {};
    var name = undefined;
    var current = undefined;
    var totVertCount = 0;
    var totVertPosCount = 0;
    var totVertTexCount = 0;
    var totVertNorCount = 0;

    // Iterate over each line
    text.split("\n").forEach((line) => {

      // Jump empty and comment lines
      if (line.length == 0 ||  line.startsWith("#")) return;
  
      // Split using spaces
      const keys = line.split(" ");
  
      // Switch command
      switch (keys[0]) {

        // "New" geometry
        case "g":
        case "o": {
          const name = keys[1].split("_")[0];
          meshes[name] = new OBJMesh();
          if (current) {
            totVertCount += current.vertexes.length;
            totVertPosCount += current.positions.length;
            totVertTexCount += current.uvs.length;
            totVertNorCount += current.normals.length;
          }
          meshes[name].startIndexVertexRawBuffer = totVertCount;
          current = meshes[name];
          break;
        }
  
        // Vertex (Position)
        case "v": {
          const x = parseFloat(keys[1]);
          const y = parseFloat(keys[2]);
          const z = parseFloat(keys[3]);
          current.positions.push(new Vec3(x, y, z));
          break;
        }
        
        // Vertex (Texture coords)
        case "vt": {
          const u = parseFloat(keys[1]);
          const v = parseFloat(keys[2]);
          current.uvs.push(new Vec2(u, v));
          break;
        }
        
        // Vertex (Normal)
        case "vn": {
          const x = parseFloat(keys[1]);
          const y = parseFloat(keys[2]);
          const z = parseFloat(keys[3]);
          current.normals.push(new Vec3(x, y, z));
          break;
        }
        
        // Face (Triangle FAN)
        case "f": {
          // Retrieve middle point
          var tmp = keys[1].split("/")
          const v0 = [parseInt(tmp[0]), parseInt(tmp[1]), parseInt(tmp[2])];

          // Iterate over each triangle of the fan
          for (let i = 0; i < keys.length - 3; ++i) {
            const v1 = keys[i + 2].split("/");
            const v2 = keys[i + 3].split("/");

            // TODO: Negatives
            // TODO: Empty indices (//)

            // Push new triangle
            const triangle = [
              v0,
              [parseInt(v1[0]), parseInt(v1[1]), parseInt(v1[2])],
              [parseInt(v2[0]), parseInt(v2[1]), parseInt(v2[2])],
            ];
            current.triangles.push(triangle);

            // Push "real" vertexes
            const vertex = (t) => ([
              ...current.positions[t[0] - 1 - totVertPosCount].values,
              ...current.uvs[t[1] - 1 - totVertTexCount].values,
              ...current.normals[t[2] - 1 - totVertNorCount].values,
            ]);
            current.vertexes.push(vertex(triangle[0]), vertex(triangle[1]), vertex(triangle[2]));
          }
          break;
        }
  
        // File name
        case "mtllib": {
          name = keys[1];
          break;
        }
      
        default: {
          if (!mute) {
            console.log("Not supported: ", keys);
          }
          break;
        }
      }
    });

    // Loaded object
    return new OBJGraph(gl, name, materials, meshes);
  }
}
