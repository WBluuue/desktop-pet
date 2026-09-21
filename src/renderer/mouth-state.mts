export type MouthState = "idle" | "speak" | "loud";

const SPEAK_ENTER_DBFS = -48;
const IDLE_ENTER_DBFS = -55;
const LOUD_ENTER_DBFS = -18;
const SPEAK_REENTER_DBFS = -24;
const REQUIRED_CANDIDATE_SAMPLES = 3;

export class MouthStateSelector {
  private committedState: MouthState = "idle";
  private candidateState: MouthState | null = null;
  private candidateSamples = 0;

  public update(levelDbfs: number): MouthState {
    const nextState = this.selectCandidate(levelDbfs);

    if (nextState === this.committedState) {
      this.candidateState = null;
      this.candidateSamples = 0;
      return this.committedState;
    }

    if (nextState === this.candidateState) {
      this.candidateSamples += 1;
    } else {
      this.candidateState = nextState;
      this.candidateSamples = 1;
    }

    if (this.candidateSamples >= REQUIRED_CANDIDATE_SAMPLES) {
      this.committedState = nextState;
      this.candidateState = null;
      this.candidateSamples = 0;
    }

    return this.committedState;
  }

  private selectCandidate(levelDbfs: number): MouthState {
    switch (this.committedState) {
      case "idle":
        return levelDbfs >= SPEAK_ENTER_DBFS ? "speak" : "idle";
      case "speak":
        if (levelDbfs >= LOUD_ENTER_DBFS) {
          return "loud";
        }

        return levelDbfs <= IDLE_ENTER_DBFS ? "idle" : "speak";
      case "loud":
        return levelDbfs <= SPEAK_REENTER_DBFS ? "speak" : "loud";
    }
  }
}
