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

const DEF_PROPS = {
  shininess: 2.0,
};

export class MaterialData {
  colorTex = null;
  shininess = 0.0;

  constructor(colorTex, props) {
    this.colorTex = colorTex;
    this.shininess = props.shininess;
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
    this.#materials.debug = new MaterialData(TemporaryTexture(gl), DEF_PROPS);

    // Terrain
    this.#loadMaterial(
      "terrain",
      {
        shininess: 2.0,
      },
      "Asphalt_004",
      DEF_TILEABLE_CONFIGS(gl)
    );

    // Grass
    this.#loadMaterial(
      "grass",
      {
        shininess: 2.0,
      },
      "Grass_005",
      DEF_TILEABLE_CONFIGS(gl)
    );

    // Asphalt
    this.#loadMaterial(
      "asphalt",
      {
        shininess: 2.0,
      },
      "Asphalt_005",
      DEF_TILEABLE_CONFIGS(gl)
    );

    // Tire
    this.#loadMaterial(
      "carTire",
      {
        shininess: 4.0,
      },
      "Rubber_Sole_001",
      DEF_CONFIGS(gl)
    );

    // Plastic
    this.#loadMaterialAsColor(
      "plastic",
      {
        shininess: 32.0,
      }, [0.3764706, 0.3764706, 0.3764706]
    );

    // Metal
    this.#loadMaterial(
      "metal",
      {
        shininess: 64.0,
      },
      "Metal_006",
      DEF_CONFIGS(gl)
    );

    // TODO
    this.#loadMaterialAsColor(
      "window",
      DEF_PROPS,
      [0.9372549, 0.9372549, 0.9372549]
    );

    this.#loadMaterialAsColor(
      "paintGreen",
      DEF_PROPS,
      [0.2392157, 0.8470588, 0.5058824]
    );

    this.#loadMaterialAsColor(
      "lightBack",
      DEF_PROPS,
      [1, 0.3490196, 0.227451]
    );

    this.#loadMaterialAsColor(
      "lightFront",
      DEF_PROPS,
      [1, 0.9762833, 0.9292453]
    );

    this.#loadMaterialAsColor(
      "border",
      DEF_PROPS,
      [0.5607843, 0.5686275, 0.6]
    );

    this.#loadMaterialAsColor(
      "trim",
      DEF_PROPS,
      [0.7372549, 0.8862745, 1]
    );

    this.#loadMaterialAsColor(
      "door",
      DEF_PROPS,
      [0.3882353, 0.4, 0.4470588]
    );

    this.#loadMaterialAsColor(
      "roof",
      DEF_PROPS,
      [0.3372549, 0.7372549, 0.6]
    );

    this.#loadMaterialAsColor(
      "wood",
      DEF_PROPS,
      [0.9098039, 0.6, 0.372549]
    );

    this.#loadMaterialAsColor(
      "foliage",
      DEF_PROPS,
      [0.2666667, 0.8, 0.5803922]
    );

    this.#loadMaterialAsColor(
      "rock",
      DEF_PROPS,
      [0.9098039, 0.8352941, 0.6745098]
    );

    this.#loadMaterialAsColor(
      "foliageFall",
      DEF_PROPS,
      [1, 0.6313726, 0.2039216]
    );

    // White
    this.#loadMaterialAsColor(
      "white",
      DEF_PROPS,
      [1, 1, 1]
    );

    // Default
    this.#loadMaterialAsColor(
      "_defaultMat",
      DEF_PROPS,
      [0.764151, 0.764151, 0.764151]
    );
  }

  #loadMaterialAsColor(alias, props, color) {
    const gl = this.#ctx;

    color = color.map((c) => Math.round(c * 255.0));
    color.push(255);

    this.#materials[alias] = new MaterialData(
      SingleColorTexture(gl, color),
      props
    );
  }

  async #loadMaterial(alias, props, name, configs) {
    const gl = this.#ctx;
    const path = MATERIAL_BASE_PATH(name);

    this.#materials[alias] = new MaterialData(
      TemporaryTexture(gl),
      props
    );

    Texture
      .FromUrl(gl, MATERIAL_COLOR_TEX(path), configs)
      .catch((err) => console.error("Unable to load material: ", name, err))
      .then((tex) => this.#materials[alias].colorTex = tex);
  }
}
