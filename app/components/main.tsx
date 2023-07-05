'use client'

import { Illustration } from "./illustration";
import { useState, useRef } from "react";
import { useFFmpeg } from "../hooks/useFFmpeg";
import { Editor } from "./editor";
import * as utils from "../utils";


export function Main() {
    const [fileName, setFileName] = useState<string>("");
    const [fileUrl, setFileUrl] = useState<string>();
    const fileBlob = useRef<Blob | null>(null);
    const ffmpeg = useFFmpeg();
   
    const handleFileLoad = async () => {
        const file = await utils.showFileDialog(
            'video/mp4, video/webm, video/quicktime, audio/ogg, video/avi, video/x-ms-wmv'
        );

        if (!file) throw new Error();

        const blob = await utils.readFile(file);

        if (!blob) throw new Error();

        if(!ffmpeg) {
            alert(
                'Unable to load script, make sure your connected to the internet and try again'
            );
            return;
        }
        
        fileBlob.current = blob;
        setFileName(file.name);
        setFileUrl(URL.createObjectURL(blob));
    }

    const handleOnCancel = () => {
        setFileUrl(undefined);
        setFileName("");
        fileBlob.current = null;
    }

    return (
        <main>
            {!fileUrl && (
                <>
                    <p className="pill">
                        Free and Private
                    </p>
                    <h1 className="z-50">Video Converter</h1>
                    <p className="description z-50">
                        Convert and trim your videos, powered by FFmpeg.js
                    </p>
                    <Illustration />
                    <div className="meta">
                    <button 
                        className="select-button mb-14"
                        onClick={handleFileLoad}
                    >
                        Select File
                    </button>
                    </div>
                </>
            )}
            {fileUrl && (
                <Editor  
                    onCancel={handleOnCancel}
                    fileName={fileName}
                    fileUrl={fileUrl}
                    blob={fileBlob.current!}
                    ffmpeg={ffmpeg!}
                />
            )}
        </main>
    )
}