import { FFmpeg } from "@diffusion-studio/ffmpeg-js";
import { useEffect, useState } from "react";

export const useFFmpeg = () => {
    const [ffmpeg, setFFmpeg] = useState<FFmpeg>();

    useEffect(() => {
        const ffmpeg = new FFmpeg();

        ffmpeg.whenReady(() => {
            setFFmpeg(ffmpeg);
        });

    }, []);

    return ffmpeg;
}