import { Texture } from "webgl-basic-lib";
import { SingleColorTexture, TemporaryTexture } from "../rendering/textures.js";

const MATERIAL_BASE_PATH = (name) => `assets/materials/${name}/${name}`;
const MATERIAL_COLOR_TEX = (basePath) => `${basePath}_COLOR.jpg`;

const DEF_CONFIGS = (gl) => ({
  target: gl.TEXTURE_2D,
  level: 0,
  format: gl.RGB,
  type: gl.UNSIGNED_BYTE,
  wrap: gl.REPEAT,
  filter: gl.LINEAR,
  genMipMap: true,
});

const DEF_TILEABLE_CONFIGS = (gl) => ({
  target: gl.TEXTURE_2D,
  level: 0,
  format: gl.RGB,
  type: gl.UNSIGNED_BYTE,
  wrap: gl.REPEAT,
  filter: {mag: gl.LINEAR, min: gl.LINEAR_MIPMAP_LINEAR},
  genMipMap: true,
});

export class MaterialData {
  colorTex = null;

  constructor(colorTex) {
    this.colorTex = colorTex;
  }
}

export class MaterialsManager {
  #ctx = null;

  #materials = {
    debug: null
  };

  #materialsToAdd = [];

  get(name) {
    const material = this.#materials[name];
    if (!material && !this.#materialsToAdd.includes(name )) {
      this.#materialsToAdd.push(name);
    }
    return material || this.#materials.debug;
  }

  constructor(gl) {
    this.#ctx = gl;
    this.#materials.debug = new MaterialData(TemporaryTexture(gl));

    this.#loadMaterial("asphalt", "Asphalt_004", DEF_TILEABLE_CONFIGS(gl));

    this.#loadMaterial("carTire", "Rubber_Sole_001", DEF_CONFIGS(gl));
    // this.#loadMaterialAsColor("carTire", [0.2392157, 0.2392157, 0.2392157]);

    this.#loadMaterialAsColor("plastic", [0.3764706, 0.3764706, 0.3764706]);

    this.#loadMaterialAsColor("window", [0.9372549, 0.9372549, 0.9372549]);
    this.#loadMaterialAsColor("paintGreen", [0.2392157, 0.8470588, 0.5058824]);

    this.#loadMaterialAsColor("lightBack", [1, 0.3490196, 0.227451]);
    this.#loadMaterialAsColor("lightFront", [1, 0.9762833, 0.9292453]);

    this.#loadMaterial("metal", "Metal_006", DEF_CONFIGS(gl));

    this.#loadMaterialAsColor("_defaultMat", [1, 1, 1]);
  }

  #loadMaterialAsColor(alias, color) {
    const gl = this.#ctx;

    color = color.map((c) => Math.round(c * 255.0));
    color.push(255);

    this.#materials[alias] = new MaterialData(
      SingleColorTexture(gl, color)
    );
  }

  async #loadMaterial(alias, name, configs) {
    const gl = this.#ctx;
    const path = MATERIAL_BASE_PATH(name);

    this.#materials[alias] = new MaterialData(TemporaryTexture(gl));

    Texture
      .FromUrl(gl, MATERIAL_COLOR_TEX(path), configs)
      .catch((err) => console.error("Unable to load material: ", name, err))
      .then((tex) => this.#materials[alias].colorTex = tex);
  }
}
