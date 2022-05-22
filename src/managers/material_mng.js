import { Texture, Vec3 } from "webgl-basic-lib";
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
  color = null;

  isComplex = null;
  colorTex = null;
  normalTex = null;

  shininess = null;

  static Simple(color, shininess) {
    const data = new MaterialData();
    data.isComplex = false;
    data.color = color;
    data.colorTex = null;
    data.normalTex = null;
    data.shininess = shininess;
    return data;
  }

  static Complex(colorTex, normalTex, shininess) {
    const data = new MaterialData();
    data.isComplex = true;
    data.color = null;
    data.colorTex = colorTex;
    data.normalTex = normalTex;
    data.shininess = shininess;
    return data;
  }

  updateUniforms(prog) {
    prog["uMaterial.shininess"].update(this.shininess);

    if (this.isComplex) {
      prog["uMaterial.isComplex"].update(1);

      this.colorTex.bind(0);
      prog["uMaterial.colorTex"].update(0);

      this.normalTex.bind(1);
      prog["uMaterial.normalTex"].update(1);
    }
    else {
      prog["uMaterial.isComplex"].update(0);

      prog["uMaterial.color"].update(this.color.values);
    }
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
      {
        shininess: 64.0,
      },
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
      "paintWhite",
      DEF_PROPS,
      [0.8980392, 0.9058824, 0.9686275]
    );

    this.#loadMaterialAsColor(
      "paintRed",
      DEF_PROPS,
      [1, 0.227451, 0.3019608]
    );

    this.#loadMaterialAsColor(
      "paintYellow",
      DEF_PROPS,
      [0.9764706, 0.7686275, 0.2745098]
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
      "woodDark",
      DEF_PROPS,
      [0.7098039, 0.4666667, 0.2901961]
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

    this.#loadMaterialAsColor(
      "roof",
      DEF_PROPS,
      [0.3372549, 0.7372549, 0.6]
    );

    this.#loadMaterialAsColor(
      "brownDarkest",
      DEF_PROPS,
      [0.2588235, 0.1607843, 0.1372549]
    );

    this.#loadMaterialAsColor(
      "brownDark",
      DEF_PROPS,
      [0.6392157, 0.3882353, 0.2784314]
    );
    
    this.#loadMaterialAsColor(
      "red",
      DEF_PROPS,
      [0.3372549, 0.7372549, 0.6]
    );

    this.#loadMaterialAsColor(
      "brownLight",
      DEF_PROPS,
      [0.9764706, 0.772549, 0.5490196]
    );

    this.#loadMaterialAsColor(
      "purpleLight",
      DEF_PROPS,
      [0.9098039, 0.6039216, 0.8156863]
    );

    this.#loadMaterialAsColor(
      "yellow",
      DEF_PROPS,
      [0.9607843, 0.7254902, 0.2588235]
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

    this.#materials[alias] = MaterialData.Simple(
      new Vec3(...color),
      props.shininess,
    );
  }

  async #loadMaterial(alias, props, name, configs) {
    const gl = this.#ctx;
    const path = MATERIAL_BASE_PATH(name);

    this.#materials[alias] = MaterialData.Complex(
      TemporaryTexture(gl),
      TemporaryTexture(gl),
      props.shininess,
    );

    Texture
      .FromUrl(gl, MATERIAL_COLOR_TEX(path), configs)
      .catch((err) => console.error("Unable to load material: ", name, err))
      .then((tex) => this.#materials[alias].colorTex = tex);
  }
}
