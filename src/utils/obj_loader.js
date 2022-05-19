// http://paulbourke.net/dataformats/obj/
// https://en.wikipedia.org/wiki/Wavefront_.obj_file

import { Mat4, Vec2, Vec3 } from "webgl-basic-lib";

export class OBJSection {
  material = null;
  index = -1;
  length = 0;

  hide = false;

  constructor(material, index) {
    this.material = material;
    this.index = index;
  }
}

export class OBJMesh {
  matrix = null;
  vBuffer = {
    ref: null,
    index: -1,
    length: 0,
  };
  lBuffer = {
    ref: null,
    index: -1,
    length: 0,
  };
  sections = [];

  hide = false;

  constructor(vBufferRef, vBufferIndex, lBufferRef, lBufferIndex) {
    this.matrix = Mat4.Identity();
    this.vBuffer.ref = vBufferRef;
    this.vBuffer.index = vBufferIndex;
    this.vBuffer.length = 0;
    this.lBuffer.ref = lBufferRef;
    this.lBuffer.index = lBufferIndex;
    this.lBuffer.length = 0;
  }
}

export class OBJGraph {
  #ctx = null;
  name = null;

  hide = false;

  meshes = null;
  materials = [];
  rawVertBuff = null;
  rawVertexesData = null;
  rawLinesBuff = null;
  rawLinesData = null;
  
  constructor(gl, name, meshes, materials, rawVertBuff, rawLinesBuff) {
    this.#ctx = gl;
    this.name = name;
    this.meshes = meshes;
    this.materials = materials;
    this.rawVertBuff = rawVertBuff;
    this.rawLinesBuff = rawLinesBuff;
  }

  static FromText(gl, text, mute, opts) {
    const meshes = {};
    const materials = [];

    var name = undefined;
    var current = undefined;

    const vertexes = [];
    const lines = [];
    const positions = [];
    const uvs = [];
    const normals = [];
    const triangles = [];

    const rawVertBuff = gl.createBuffer();
    const rawLinesBuff = gl.createBuffer();

    // Iterate over each line
    text.split("\n").forEach((line) => {
      line = line.replace("\r", "");

      // Jump empty and comment lines
      if (line.length == 0 ||  line.startsWith("#")) return;
  
      // Split using spaces
      const keys = line.split(" ");
  
      // Switch command
      switch (keys[0]) {

        // "New" geometry
        case "g":
        case "o": {
          const name = keys[1];
          if (current) {
            current.vBuffer.length = vertexes.length - current.vBuffer.index;
            current.lBuffer.length = lines.length - current.lBuffer.index;
          }
          if (current?.sections.at(-1)) {
            current.sections.at(-1).length = (vertexes.length - current.sections.at(-1).index);
          }
          meshes[name] = new OBJMesh(
            rawVertBuff,
            vertexes.length,
            rawLinesBuff,
            lines.length,
          );
          current = meshes[name];
          break;
        }
  
        // Vertex (Position)
        case "v": {
          const x = parseFloat(keys[1]);
          const y = parseFloat(keys[2]);
          const z = parseFloat(keys[3]);
          positions.push(new Vec3(x, y, z));
          break;
        }
        
        // Vertex (Texture coords)
        case "vt": {
          var u = parseFloat(keys[1]);
          var v = parseFloat(keys[2]);
          if (opts?.procUvs) {
            [u, v] = opts.procUvs(u, v);
          }
          uvs.push(new Vec2(u, v));
          break;
        }
        
        // Vertex (Normal)
        case "vn": {
          const x = parseFloat(keys[1]);
          const y = parseFloat(keys[2]);
          const z = parseFloat(keys[3]);
          normals.push(new Vec3(x, y, z));
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
            triangles.push(triangle);

            // Push "real" vertexes
            const vertex = (t) => ([
              ...positions[t[0] - 1].values,
              ...uvs[t[1] - 1].values,
              ...normals[t[2] - 1].values,
            ]);
            vertexes.push(vertex(triangle[0]), vertex(triangle[1]), vertex(triangle[2]));

            // Push lines
            const index = vertexes.length - 3;
            lines.push(
              index + 0, index + 1,
              index + 1, index + 2,
              index + 2, index + 0,
            );
          }
          break;
        }

        // Update material for mesh
        case "usemtl": {
          // name = keys[1];
          const materialName = keys[1];

          if (!materials.includes(materialName)) materials.push(materialName);

          if (current.sections.at(-1)) {
            current.sections.at(-1).length = (vertexes.length - current.sections.at(-1).index);
          }

          current.sections.push(new OBJSection(materialName, vertexes.length));
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

    if (current) {
      current.vBuffer.length = vertexes.length - current.vBuffer.index;
      current.lBuffer.length = lines.length - current.lBuffer.index;
    }
    if (current?.sections.at(-1)) {
      current.sections.at(-1).length = (vertexes.length - current.sections.at(-1).index);
    }

    Object.values(meshes).forEach((mesh) => {
      mesh.lBuffer.index *= 2;
      mesh.lBuffer.length /= 2;
    })

    // Loaded object
    const object = new OBJGraph(gl, name, meshes, materials, rawVertBuff, rawLinesBuff);
    object.#uploadData(vertexes, lines);
    return object;
  }

  #uploadData(vertexes, lines) {
    const gl = this.#ctx;
    
    this.rawVertexesData = new Float32Array(vertexes.flat());
    this.rawLinesData = new Uint16Array(lines);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.rawVertBuff);
    gl.bufferData(gl.ARRAY_BUFFER, this.rawVertexesData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.rawLinesBuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.rawLinesData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    if (vertexes.length > 65000) {
      console.warn("Really complex object (>65k vertexes)");
    }

    if (lines.length > 65000) {
      console.warn("Really complex object (>65k lines)");
    }
  }
}
