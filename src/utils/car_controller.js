import { toRad, Vec3 } from "webgl-basic-lib";

export class CarController {
  #forward = 0;
  #backward = 0;
  #left = 0;
  #right = 0;

  #friction = 1.5;
  #acceleration = 3.0;
  #speed = 0;
  #maxSpeed = 10.0;
  
  #turnSpeed = 90;
  
  #wheelSpeedFactor = 360;

  get acceleration() { return this.#acceleration; }
  get speed() { return this.#speed; }
  get turnSpeed() { return toRad(this.#turnSpeed); }
  get wheelSpeed() { return this.#speed * this.#wheelSpeedFactor; }

  get frontFactor() { return this.#forward - this.#backward; }
  get rightFactor() { return this.#right - this.#left; }

  onKeyDown(event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW": {
        this.#forward = 1;
        break;
      }
      case "ArrowDown":
      case "KeyS": {
        this.#backward = 1;
        break;
      }
      case "ArrowLeft":
      case "KeyA": {
        this.#left = 1;
        break;
      }
      case "ArrowRight":
      case "KeyD": {
        this.#right = 1;
        break;
      }
      default:
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW": {
        this.#forward = 0;
        break;
      }
      case "ArrowDown":
      case "KeyS": {
        this.#backward = 0;
        break;
      }
      case "ArrowLeft":
      case "KeyA": {
        this.#left = 0;
        break;
      }
      case "ArrowRight":
      case "KeyD": {
        this.#right = 0;
        break;
      }
      default:
        break;
    }
  }

  update(dt) {
    // Prevent "teleportation" when offscreen
    if (dt > 1.0) {
      this.#speed = 0.0;
      return;
    }

    // Requested direction
    const reqDir = this.frontFactor;

    // Current direction
    const dir = Math.sign(this.#speed);

    // Stop car if necessary
    if (Math.abs(this.#speed) < 0.2 && reqDir == 0.0) {
      this.#speed = 0.0;
      return;
    }

    /**
     * p (position), v (velocity), a (acceleration), f (friction)
     * 
     * v' = v + a * dt
     * v'' = v' - dir(v) * f * dt
     * 
     * p' = p + v'' * dt
     */

    this.#speed = this.#speed + reqDir * this.#acceleration * dt;
    this.#speed = this.#speed - dir * this.#friction * dt;

    // Cap to max speed
    if (Math.abs(this.#speed) > this.#maxSpeed) {
      this.#speed = dir * this.#maxSpeed;
    }

    // FIX: Speed (0)
  }
}
