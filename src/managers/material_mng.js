import { Texture, Vec3 } from "webgl-basic-lib";
import { SingleColorTexture, TemporaryColorTexture, TemporaryNormalTexture, TemporarySpecularTexture } from "../rendering/textures.js";

const MATERIAL_BASE_PATH = (name) => `assets/materials/${name}/${name}`;
const MATERIAL_COLOR_TEX = (basePath) => `${basePath}_COLOR.jpg`;
const MATERIAL_NORMAL_TEX = (basePath) => `${basePath}_NORM.jpg`;
const MATERIAL_SPECULAR_TEX = (basePath) => `${basePath}_ROUGH.jpg`;

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

const IS_LIT_FLAG = 1;
const DEF_PROPS = {
  shininess: 2.0,
  isLit: true,
};
const DEF_LOW_SHININESS_PROPS = {
  shininess: 1.0,
  isLit: true,
};
const DEF_HIGH_SHININESS_PROPS = {
  shininess: 32.0,
  isLit: true,
};
const DEF_GLOWING_PROPS = {
  shininess: 0.0,
  isLit: false,
};

const DAY_TAG = "#day";
const NIGHT_TAG = "#night";

export class MaterialData {
  color = null;

  isComplex = null;
  colorTex = null;
  normalTex = null;
  specularTex = null;

  shininess = null;
  isLit = null;

  get metadata() {
    return (
      ((this.isLit) ? IS_LIT_FLAG : 0)
    );
  }

  static Simple(color, props) {
    const data = new MaterialData();
    data.isComplex = false;
    data.color = color;
    data.colorTex = null;
    data.normalTex = null;
    data.shininess = props.shininess;
    data.isLit = props.isLit;
    return data;
  }

  static Complex(colorTex, normalTex, specularTex, props) {
    const data = new MaterialData();
    data.isComplex = true;
    data.color = null;
    data.colorTex = colorTex;
    data.normalTex = normalTex;
    data.specularTex = specularTex;
    data.shininess = props.shininess;
    data.isLit = props.isLit;
    return data;
  }

  bindUniforms(prog) {
    prog["uMaterial.shininess"].update(this.shininess);
    prog["uMaterial.metadata"].update(this.metadata);

    if (this.isComplex) {
      prog["uMaterial.isComplex"].update(1);
      
      this.colorTex.bind(0);
      prog["uMaterial.colorTex"].update(0);
      
      this.normalTex.bind(1);
      prog["uMaterial.normalTex"].update(1);
      
      this.specularTex.bind(2);
      prog["uMaterial.specularTex"].update(2);
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

  get(isDay, name) {
    // Prioritize Day/Night material
    const DNmaterial = this.#materials[name + ((isDay) ? DAY_TAG : NIGHT_TAG)];
    if (DNmaterial) return DNmaterial;

    // Check for "generic"
    const material = this.#materials[name];
    if (!material && !this.#materialsToAdd.includes(name)) {
      this.#materialsToAdd.push(name);
      console.warn("Material: ", name, " not found");
    }

    // Returns (or default)
    return material || this.#materials.debug;
  }

  constructor(gl) {
    this.#ctx = gl;
    // this.#materials.debug = MaterialData.Complex(TemporaryColorTexture(gl), TemporaryNormalTexture(gl), TemporarySpecularTexture(gl), DEF_PROPS);
    // this.#materials.debug = MaterialData.Simple(new Vec3(1, 1, 1), DEF_PROPS);

    {
      // Buildings
      this.#loadMaterialAsColor("buildingWindow", DEF_PROPS, [0.9372549, 0.9372549, 0.9372549]);
      this.#loadMaterialAsColor("buildingBorder", DEF_PROPS, [0.5607843, 0.5686275, 0.6]);
      this.#loadMaterialAsColor("buildingDoor", DEF_PROPS, [0.3882353, 0.4, 0.4470588]);
      this.#loadMaterialAsColor("buildingTrim", DEF_PROPS, [0.7372549, 0.8862745, 1]);
      this.#loadMaterialAsColor("buildingRoof", DEF_PROPS, [0.3372549, 0.7372549, 0.6]);
      this.#loadMaterialAsColor("buildingDefault", DEF_PROPS, [0.764151, 0.764151, 0.764151]);

      // Cars
      this.#loadMaterialAsColor("carPlastic", DEF_PROPS, [0.3764706, 0.3764706, 0.3764706]);
      this.#loadMaterialAsColor("carLightBack", DEF_PROPS, [1, 0.3490196, 0.227451]);
      this.#loadMaterialAsColor("carLightFront", DEF_PROPS, [1, 0.9762833, 0.9292453]);
      this.#loadMaterialAsColor("carTire", DEF_PROPS, [0.1, 0.1, 0.1]);
      this.#loadMaterialAsColor("carWindow", DEF_PROPS, [0.9372549, 0.9372549, 0.9372549]);
      this.#loadMaterialAsColor("carTintWhite", DEF_PROPS, [0.8980392, 0.9058824, 0.9686275]);
      this.#loadMaterialAsColor("carTintGreen", DEF_PROPS, [0.2392157, 0.8470588, 0.5058824]);
      this.#loadMaterialAsColor("carTintRed", DEF_PROPS, [1, 0.227451, 0.3019608]);
      this.#loadMaterialAsColor("carTintYellow", DEF_PROPS, [0.9764706, 0.7686275, 0.2745098]);
      this.#loadMaterialAsColor("carDefault", DEF_PROPS, [0.764151, 0.764151, 0.764151]);

      // Environment: Food
      this.#loadMaterialAsColor("foodYellow", DEF_PROPS, [0.9607843, 0.7254902, 0.2588235]);
      this.#loadMaterialAsColor("foodBrownLight", DEF_PROPS, [0.9607843, 0.7254902, 0.2588235]);
      this.#loadMaterialAsColor("foodBrownDark", DEF_PROPS, [0.6392157, 0.3882353, 0.2784314]);
      this.#loadMaterialAsColor("foodBrownDarkest", DEF_PROPS, [0.2588235, 0.1607843, 0.1372549]);
      this.#loadMaterialAsColor("foodRed", DEF_PROPS, [0.3372549, 0.7372549, 0.6]);
      this.#loadMaterialAsColor("foodPurpleLight", DEF_PROPS, [0.9098039, 0.6039216, 0.8156863]);
      this.#loadMaterialAsColor("foodDefault", DEF_PROPS, [0.764151, 0.764151, 0.764151]); // (?)

      // Environment: Objects
      this.#loadMaterialAsColor("environmentMetal", DEF_PROPS, [0.6, 0.6, 0.6]);
      this.#loadMaterialAsColor("environmentWood", DEF_PROPS, [0.9098039, 0.6, 0.372549]);
      this.#loadMaterialAsColor("environmentWoodDark", DEF_PROPS, [0.7098039, 0.4666667, 0.2901961]);
      this.#loadMaterialAsColor("environmentFoliage", DEF_PROPS, [0.2666667, 0.8, 0.5803922]);
      this.#loadMaterialAsColor("environmentFoliageFall", DEF_PROPS, [1, 0.6313726, 0.2039216]);
      this.#loadMaterialAsColor("environmentRock", DEF_PROPS, [0.9098039, 0.8352941, 0.6745098]);
      
      // Terrain
      this.#loadMaterialAsColor("terrainTerrain", DEF_PROPS, [0.5, 0.5, 0.5]);
      // this.#loadMaterial("terrainTerrain", DEF_HIGH_SHININESS_PROPS, "Asphalt_002", DEF_TILEABLE_CONFIGS(gl));
      this.#loadMaterialAsColor("terrainGrass", DEF_PROPS, [0.270, 0.580, 0.262]);
      this.#loadMaterialAsColor("terrainAsphalt", DEF_PROPS, [0.25, 0.25, 0.25]);
    }

    {
      // this.#loadMaterialAsColor("window", DEF_PROPS, [0.9372549, 0.9372549, 0.9372549]);
      // this.#loadMaterialAsColor("window" + NIGHT_TAG, DEF_GLOWING_PROPS, [2, 2, 2]);
    }
  }

  #loadMaterialAsColor(alias, props, color) {
    const gl = this.#ctx;

    this.#materials[alias] = MaterialData.Simple(
      new Vec3(...color),
      props,
    );
  }

  async #loadMaterial(alias, props, name, configs) {
    const gl = this.#ctx;
    const path = MATERIAL_BASE_PATH(name);

    this.#materials[alias] = MaterialData.Complex(
      TemporaryColorTexture(gl),
      TemporaryNormalTexture(gl),
      TemporarySpecularTexture(gl),
      props,
    );

    Texture
      .FromUrl(gl, MATERIAL_COLOR_TEX(path), configs)
      .catch((err) => console.error("Unable to load material: ", name, err))
      .then((tex) => this.#materials[alias].colorTex = tex);

    Texture
      .FromUrl(gl, MATERIAL_NORMAL_TEX(path), configs)
      .catch((err) => console.error("Unable to load material: ", name, err))
      .then((tex) => this.#materials[alias].normalTex = tex);

    Texture
      .FromUrl(gl, MATERIAL_SPECULAR_TEX(path), configs)
      .catch((err) => console.error("Unable to load material: ", name, err))
      .then((tex) => this.#materials[alias].specularTex = tex);
  }
}
