import "./index.css";
import { Composition } from "remotion";
import { MediVoicePromo, VIDEO_DURATION } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MediVoicePromo"
        component={MediVoicePromo}
        durationInFrames={VIDEO_DURATION}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
