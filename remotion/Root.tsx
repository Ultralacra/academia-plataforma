import React from "react";
import { Composition } from "remotion";
import { EmmaIntro } from "./compositions/EmmaIntro";
import { EmmaChatDemo } from "./compositions/EmmaChatDemo";
import { EmmaTickets } from "./compositions/EmmaTickets";
import { EmmaFeatures } from "./compositions/EmmaFeatures";
import { EmmaFullDemo } from "./compositions/EmmaFullDemo";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="EmmaFullDemo"
        component={EmmaFullDemo}
        durationInFrames={1260}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EmmaIntro"
        component={EmmaIntro}
        durationInFrames={330}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EmmaChatDemo"
        component={EmmaChatDemo}
        durationInFrames={500}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EmmaTickets"
        component={EmmaTickets}
        durationInFrames={390}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EmmaFeatures"
        component={EmmaFeatures}
        durationInFrames={570}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
}
