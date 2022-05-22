import { Texture, Vec3 } from "webgl-basic-lib";
import { SingleColorTexture, TemporaryColorTexture, TemporaryNormalTexture } from "../rendering/textures.js";

const MATERIAL_BASE_PATH = (name) => `assets/materials/${name}/${name}`;
const MATERIAL_COLOR_TEX = (basePath) => `${basePath}_COLOR.jpg`;
const MATERIAL_NORMAL_TEX = (basePath) => `${basePath}_NORM.jpg`;

const DEF_CONFIGS = (gl) => ({
  target: gl.TEXTURE_2D,
  level: 0,
  format: gl.RGB,
  type: gl.UNSIGNED_BYTE,
  wrap: gl.REPEAT,
  filter: {mag: gl.LINEAR, min: gl.LINEAR_MIPMAP_LINEAR},
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

  static Simple(color, props) {
    const data = new MaterialData();
    data.isComplex = false;
    data.color = color;
    data.colorTex = null;
    data.normalTex = null;
    data.shininess = props.shininess;
    return data;
  }

  static Complex(colorTex, normalTex, props) {
    const data = new MaterialData();
    data.isComplex = true;
    data.color = null;
    data.colorTex = colorTex;
    data.normalTex = normalTex;
    data.shininess = props.shininess;
    return data;
  }

  bindUniforms(prog) {
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
    this.#materials.debug = MaterialData.Complex(TemporaryColorTexture(gl), TemporaryNormalTexture(gl), DEF_PROPS);

    this.#loadMaterialAsColor(
      "terrain",
      DEF_PROPS,
      [0.5, 0.5, 0.5]
    );

    this.#loadMaterialAsColor(
      "grass",
      DEF_PROPS,
      [0.2, 1.0, 0.2]
    );

    this.#loadMaterialAsColor(
      "asphalt",
      DEF_PROPS,
      [0.25, 0.25, 0.25]
    );

    this.#loadMaterialAsColor(
      "carTire",
      DEF_PROPS,
      [0.1, 0.1, 0.1]
    );

    this.#loadMaterialAsColor(
      "metal",
      DEF_PROPS,
      [0.6, 0.6, 0.6]
    );

    this.#loadMaterialAsColor(
      "plastic",
      DEF_PROPS,
      [0.3764706, 0.3764706, 0.3764706]
    );

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
      TemporaryColorTexture(gl),
      TemporaryNormalTexture(gl),
      props.shininess,
    );

    Texture
      .FromUrl(gl, MATERIAL_COLOR_TEX(path), configs)
      .catch((err) => console.error("Unable to load material: ", name, err))
      .then((tex) => this.#materials[alias].colorTex = tex);

    Texture
      .FromUrl(gl, MATERIAL_NORMAL_TEX(path), configs)
      .catch((err) => console.error("Unable to load material: ", name, err))
      .then((tex) => this.#materials[alias].normalTex = tex);
  }
}
