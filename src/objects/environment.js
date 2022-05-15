import { Cube, Debug, LinesFromTriangles, Mat4, MatrixStack, Program, Quad, RealisticShape, Shader, Shape, Texture, TextureConfigs, toRad, Vec3, Vec4 } from "webgl-basic-lib";
import { Track } from "./track.js";
import { Terrain } from "./terrain.js";
import { StreetLamp } from "./street_lamp.js";
import { LightMng } from "../graphics/light.js";

export class Environment {
  #ctx = null;
  #stack = new MatrixStack();

  #terrain = null;
  #track = null;
  #street_lamps = null;
  #lightMng = null;

  constructor(gl, lightMng) {
    this.#ctx = gl;
    this.#lightMng = lightMng;

    this.#terrain = new Terrain(gl, this.#lightMng);
    this.#track = new Track(gl, this.#lightMng);

    this.#street_lamps = new Array(4).fill(null).map((_, ind) => {
      return new StreetLamp(gl, this.#lightMng, new Vec3(-1.5, 0, ind * 10 + 2));
    });
  }

  update(dt) {

  }

  draw(camera) {
    const gl = this.#ctx;

    this.#stack.push(camera.viewproj);

    this.#terrain.draw(camera, this.#stack);
    this.#track.draw(camera, this.#stack);

    this.#street_lamps.forEach((lamp) => lamp.draw(camera, this.#stack));

    this.#lightMng.draw(camera, this.#stack);

    this.#stack.pop();
  }
}
