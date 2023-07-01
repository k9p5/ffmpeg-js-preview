'use client'


import { useFFmpeg } from "../hooks/useFFmpeg";
import { Illustration } from "./illustration";
import { useState } from "react";
import * as utils from "../utils";


export function Main() {
    const [converting, setConverting] = useState(false);
    const ffmpeg = useFFmpeg();

    const handleOnClick = async () => {
        try {
            if(!ffmpeg) throw new Error();

            const file = await utils.showFileDialog(
                'video/mp4, video/webm, video/quicktime, audio/ogg, video/avi, video/x-ms-wmv'
            );

            if (!file) throw new Error();

            const blob = await utils.readFile(file);

            if (!blob) throw new Error();

            setConverting(true);

            const result: Uint8Array | undefined = await ffmpeg
                .input({ source: blob })
                .ouput({ format: 'gif' })
                .export()

            setConverting(false);

            if (!result) throw new Error();

            alert('File has been converted successfully, download now.');
            utils.downloadData(result, 'video/gif', `${file.name.split('.')[0]}.gif`);
        } catch (e) {
            alert('File processing failed!');
        }
    }

    return (
        <main>
            <p className="pill">
            Preview Application
            </p>
            <h1 style={{ zIndex: 999 }}>GIF Converter</h1>
            <p style={{ zIndex: 999 }} className="description">
            Turn your videos into GIFs, powered by FFmpeg.js
            </p>
            <Illustration />
            <div className="meta">
            <button 
                className="select-button"
                onClick={handleOnClick}
                disabled={converting}
            >
                {converting ? "Converting..." : "Select File"}
            </button>
            </div>
        </main>
    )
}