const DEFAULT_FLOOR_DBFS = -100;
const RMS_EPSILON = Number.EPSILON;

export function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumOfSquares = 0;

  for (const sample of samples) {
    sumOfSquares += sample * sample;
  }

  return Math.sqrt(sumOfSquares / samples.length);
}

export function rmsToDbfs(
  rms: number,
  floorDbfs = DEFAULT_FLOOR_DBFS,
): number {
  if (!Number.isFinite(rms) || rms <= 0) {
    return floorDbfs;
  }

  const dbfs = 20 * Math.log10(Math.max(rms, RMS_EPSILON));
  return Math.max(floorDbfs, Math.min(0, dbfs));
}

export function samplesToDbfs(samples: Float32Array): number {
  return rmsToDbfs(calculateRms(samples));
}

export class AudioLevelSmoother {
  private smoothedDbfs: number;

  public constructor(
    private readonly attackCoefficient = 0.45,
    private readonly releaseCoefficient = 0.12,
    initialDbfs = DEFAULT_FLOOR_DBFS,
  ) {
    this.smoothedDbfs = initialDbfs;
  }

  public update(levelDbfs: number): number {
    const coefficient =
      levelDbfs > this.smoothedDbfs
        ? this.attackCoefficient
        : this.releaseCoefficient;

    this.smoothedDbfs += coefficient * (levelDbfs - this.smoothedDbfs);
    return this.smoothedDbfs;
  }
}
