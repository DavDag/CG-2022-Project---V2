import { Camera, Mat4, Vec3, Vec4 } from "webgl-basic-lib";

export class CameraManager {
  #ctx = null;

  #cameras = {
    thirdPerson: {
      obj: new Camera(
        45,                 // FOVY
        1.0,                // RATIOWH
        0.1,                // NEAR
        100.0,              // FAR
        new Vec3(0, 2, -3), // POS
        new Vec3(0, -0.75, 2), // DIR
        new Vec3(0, 1, 0),  // UP
        false,              // ISFIXED
      ),
      followPlayer: true,
    },
    sideways: {
      obj: new Camera(
        45,                     // FOVY
        1.0,                    // RATIOWH
        0.1,                    // NEAR
        100.0,                  // FAR
        new Vec3(1.5, 0.25, 0), // POS
        new Vec3(-1, -0.1, 0),  // DIR
        new Vec3(0, 1, 0),      // UP
        false,                  // ISFIXED
      ),
      followPlayer: true,
    },
    /*
    firstPerson: {
      followPlayer: true,
    },
    retro: {
      followPlayer: true,
    },
    */
    topDown: {
      obj: new Camera(
        45,                 // FOVY
        1.0,                // RATIOWH
        0.1,                // NEAR
        100.0,              // FAR
        new Vec3(0, 15, 0), // POS
        new Vec3(0, -1, 0), // DIR
        new Vec3(0, 0, 1),  // UP
        false,              // ISFIXED
      ),
      followPlayer: true,
    },
    cityView: {
      obj: new Camera(
        45,                  // FOVY
        1.0,                 // RATIOWH
        0.1,                 // NEAR
        100.0,               // FAR
        new Vec3(0, 50, 0),  // POS
        new Vec3(0, -1, 0),  // DIR
        new Vec3(0, 0, 1),   // UP
        false,               // ISFIXED
      ),
      followPlayer: false,
    },
    bigview: {
      obj: new Camera(
        45,                   // FOVY
        1.0,                  // RATIOWH
        0.1,                  // NEAR
        100.0,                // FAR
        new Vec3(0, 50, -50), // POS
        new Vec3(0, -50, 50), // DIR
        new Vec3(0, 0, 1),    // UP
        false,                // ISFIXED
      ),
      followPlayer: true,
    }
  };

  #selected = 4;
  
  #cachedViewMat = Mat4.Identity();
  #cachedProjMat = Mat4.Identity();
  #cachedViewProjMat = Mat4.Identity();
  #cachedViewPos = Vec3.Zeros();
  #playerMat = Mat4.Identity();
  #playerMatInv = Mat4.Identity();

  forceFollowPlayer = 0; // 0: None, 1: True, 2: False

  get current() {
    return {
      name: Object.keys(this.#cameras)[this.#selected],
      view: this.#cachedViewMat,
      proj: this.#cachedProjMat,
      viewproj: this.#cachedViewProjMat,
      viewpos: this.#cachedViewPos,
    };
  }

  constructor(gl) {
    this.#ctx = gl;
  }

  #update() {
    const cam = Object.values(this.#cameras)[this.#selected];
    const projMat = cam.obj.perspectiveMat;
    var viewMat = cam.obj.lookatMat;

    if ((cam.followPlayer && this.forceFollowPlayer == 0) || this.forceFollowPlayer == 1) {
      viewMat.apply(this.#playerMatInv);
    } else if (this.forceFollowPlayer == 2) {
      viewMat = this.#cachedViewMat.clone();
    }

    this.#cachedViewMat = viewMat;
    this.#cachedProjMat = projMat;
    this.#cachedViewProjMat = Mat4.Identity().apply(projMat).apply(viewMat);
    this.#cachedViewPos = viewMat.clone().inverse().col(3).toVec3();
  }
  
  onResize(factor) {
    Object.values(this.#cameras).forEach((cam) => cam.obj.ratio = factor);
    this.#update();
  }

  nextCamera() {
    this.#selected = (this.#selected + 1) % Object.values(this.#cameras).length;
    this.#update();
  }

  updatePlayerMat(playerMat) {
    if (!playerMat) return;
    this.#playerMat = playerMat;
    this.#playerMatInv = playerMat.clone().inverse();
    this.#update();
  }
}
