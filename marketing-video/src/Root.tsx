import "./index.css";
import { Composition } from "remotion";
import { MediVoicePromo } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MediVoicePromo"
        component={MediVoicePromo}
        durationInFrames={450}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
