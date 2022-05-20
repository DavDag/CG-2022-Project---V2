import { Vec3 } from "webgl-basic-lib";

function Lerp(a, b, f) {
  return a + f * (b - a);
}

export function CreateSSAOKernels(sz) {
  const kernels = [];
  for (let k = 0; k < sz; ++k) {
    // Create kernel (Hemisphere)
    const sample = new Vec3(
      Math.random() * 2.0 - 1.0, // [-1, 1]
      Math.random() * 2.0 - 1.0, // [-1, 1]
      Math.random(),             // [ 0, 1]
    );
    sample.normalize();
    sample.mul(Math.random());

    // Distribute them non-linearly
    const f = (k / sz);
    const scale = Lerp(0.1, 1.0, f * f);
    sample.mul(scale);

    // Add to kernels
    kernels.push(sample);
  }
  return kernels;
}

export function CreateSSAONoise(sz) {
  const noise = [];
  for (let n = 0; n < sz; ++n) {
    const sample = new Vec3(
      Math.random() * 2.0 - 1.0, // [-1, 1]
      Math.random() * 2.0 - 1.0, // [-1, 1]
      0.0,
    );
    noise.push(sample);
  }
  return noise;
}
