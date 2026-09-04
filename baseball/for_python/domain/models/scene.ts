import { LiveHeaderJson, LiveBodyJson, PitchInfoJson, TeamInfoJson } from "../../type/jsonType";

export class Scene {
  constructor(
    public readonly sceneNo: number,
    public readonly liveHeader: LiveHeaderJson,
    public readonly liveBody: LiveBodyJson,
    public readonly pitchInfo: PitchInfoJson,
    public readonly homeTeamInfo: TeamInfoJson,
    public readonly awayTeamInfo: TeamInfoJson
  ) {}
}
