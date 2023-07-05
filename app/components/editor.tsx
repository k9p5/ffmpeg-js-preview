'use client'

import { useState, useRef, useEffect, ChangeEvent, useMemo } from "react";
import { SUPPORTED_VIDEO_CONVERSIONS } from "../fixtures";
import * as utils from "../utils";
import { FFmpeg } from "@diffusion-studio/ffmpeg-js";
import Script from "next/script";

type Format = 'avi' | 'gif' | 'wmv' | 'ogg' | 'mov' | 'webm' | 'mp4';

const MimeTypeMap: Record<string, Format> = {
    'video/mp4': 'mp4',
    'video/avi': 'avi',
    'video/x-ms-wmv': 'wmv',
    'audio/ogg': 'ogg',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
}

interface IEditor {
    blob: Blob;
    fileName: string;
    fileUrl: string;
    onCancel(): void;
    ffmpeg: FFmpeg;
}

export function Editor(props: IEditor) {
    const [converting, setConverting] = useState<boolean>(false);
    const [playing, setPlaying] = useState<boolean>(false);
    const [outputFormat, setOutputFormat] = useState<Format>("gif");
    const [progress, setProgress] = useState<string>("0");
    const [previewAvailable, setPreviewAvailable] = useState<boolean>(true);
    const [images, setImages] = useState<string[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const trimMaskRef = useRef<HTMLDivElement>(null);
    const dragareaRef = useRef<HTMLDivElement>(null);
    const leftMaskHandleRef = useRef<HTMLDivElement>(null);
    const rightMaskHandleRef = useRef<HTMLDivElement>(null);
    const [metadata, setMetadata] = useState({
        duration: 1,
        width: 1,
        height: 1,
        fps: 1
    });
    const [outputFps, setOutputFps] = useState<string>();
    const [outputSize, setOutputSize] = useState<string>();

    useEffect(() => {
        // this effect gets metadata from the video
        // and extracts frames to be displayed in the timeline
        (async () => {
            if(!timelineRef.current) return;
            const { ffmpeg } = props;

            const meta = metadata;
            const cb = utils.parseFFmpegMetadata(meta);
            ffmpeg.onMessage(cb);
            await ffmpeg.writeFile('probe', props.blob);
            await ffmpeg.exec(['-i', 'probe']);
            ffmpeg.removeOnMessage(cb);
            setMetadata(meta);

            const tl = timelineRef.current;
            const imgWidth = (tl.clientHeight * 16 / 9);
            const count = Math.round(tl.clientWidth / imgWidth) + 1;
            const step = meta.duration / count;

            for (let i = 0; i < meta.duration; i += step) {
                await ffmpeg.exec(['-ss', i.toString(), '-i', 'probe', '-frames:v', '1', 'image.jpg'])
                try {
                const res = await ffmpeg.readFile('image.jpg');
                setImages(imgs => [...imgs, URL.createObjectURL(new Blob([res], { type: 'image/jpeg' }))])
                } catch (e) { }
            }
            ffmpeg.clearMemory();
        })()
    }, []);

    useEffect(() => {
        // This effect controls the trim behavior
        if(!dragareaRef.current 
        || !trimMaskRef.current
        || !leftMaskHandleRef.current
        || !rightMaskHandleRef.current
        ) return;

        dragareaRef.current.addEventListener('mousedown', (downEv) => {
            downEv.preventDefault();
            let active: { left?: boolean, right?: boolean} = {};
            const leftBox = leftMaskHandleRef.current?.getBoundingClientRect()!;
            const rightBox = rightMaskHandleRef.current?.getBoundingClientRect()!;

            if(downEv.clientX >= leftBox.x && downEv.clientX <= leftBox.x + leftBox.width) {
                Object.assign(active, { left: true });
            }

            if(downEv.clientX >= rightBox.x && downEv.clientX <= rightBox.x + rightBox.width) {
                Object.assign(active, { right: true });
            }

            const mousemove = (moveEv: MouseEvent) => {
                moveEv.preventDefault();
                if(!trimMaskRef.current) return;
    
                if(active?.left && moveEv.offsetX < rightBox.x) {
                    if(moveEv.offsetX >= 0) {
                        trimMaskRef.current.style.marginLeft = moveEv.offsetX + "px";
                    }
                }
                if(active?.right) {
                    const offset = dragareaRef.current!.clientWidth - moveEv.offsetX;
                    if(offset >= 0) {
                        trimMaskRef.current.style.marginRight = offset + "px";
                    }
                }
            }

            dragareaRef.current?.addEventListener('mousemove', mousemove);
            document.addEventListener('mouseup', (upEv) => {
                upEv.preventDefault();
                active = {}
                dragareaRef.current?.removeEventListener('mousemove', mousemove);
            });
        });

    }, [trimMaskRef, dragareaRef, leftMaskHandleRef, rightMaskHandleRef]);

    useEffect(() => {
        // This effect controls the current time of the video
        // when the user clicks on the timeline
        dragareaRef.current?.addEventListener('click', (ev)  => {
            if(!videoRef.current || !dragareaRef.current) return;

            const leftBox = leftMaskHandleRef.current?.getBoundingClientRect()!;
            const rightBox = rightMaskHandleRef.current?.getBoundingClientRect()!;

            if(ev.clientX >= leftBox.x && ev.clientX <= leftBox.x + leftBox.width) {
                return;
            }

            if(ev.clientX >= rightBox.x && ev.clientX <= rightBox.x + rightBox.width) {
                return;
            }

            const offset = ev.offsetX / dragareaRef.current.clientWidth;
            videoRef.current.currentTime = offset * videoRef.current.duration;
        });
    }, [dragareaRef, videoRef]);

    useEffect(() => {
        // this effect tracks the video playback state
        videoRef.current?.addEventListener('play', () => {
            setPlaying(true);
            if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
                videoRef.current?.requestVideoFrameCallback(handleVideoFrameCallback);
            }  
        });
        videoRef.current?.addEventListener('pause', () => {
            setPlaying(false);
        });
        videoRef.current?.addEventListener('error', () => {
            setPreviewAvailable(false);
        });
        if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) {
            videoRef.current?.addEventListener("timeupdate", () => {
                updateCursorPosition(videoRef.current?.currentTime ?? 0);
            });
        }
    }, [videoRef]);

    useEffect(() => {
        const progressCallback = (frame: number) => {
            const totalFrames = Math.round(metadata.duration * metadata.fps);
            setProgress(Math.round(frame * 100 / totalFrames).toString())
        }

        if(metadata.duration > 1 && metadata.fps > 1) {
            props.ffmpeg.onProgress(progressCallback);
        }
        
        return () => {
            props.ffmpeg.removeOnProgress(progressCallback);
        }
    }, [metadata.duration]);

    const updateCursorPosition = (currentTime: number) => {
        if(!videoRef.current || !timelineRef.current || !cursorRef.current) return;
      
        const offset = timelineRef.current.clientWidth * (currentTime / videoRef.current.duration);

        cursorRef.current.style.transform = `translateX(${offset}px)`;

        const stop = getVideoStop()
        if(stop && currentTime >= stop) {
            const start = getVideoStart() ?? 0;
            videoRef.current.pause();
            videoRef.current.currentTime = start;
        }
    };

    const handleVideoFrameCallback: VideoFrameRequestCallback = (_, meta) => {
        updateCursorPosition(meta.mediaTime);
        videoRef.current?.requestVideoFrameCallback(handleVideoFrameCallback);
    }

    const exportVideo = async () => {
        try {
            const { ffmpeg } = props;

            setConverting(true);

            const start = getVideoStart();
            const stop = getVideoStop();
            
            const input = { source: props.blob };
            const output = { format: outputFormat, duration: stop };
            const video = {};

            if(start) {
                Object.assign(input, { seek: start });
            }

            if(stop) {
                Object.assign(output, { duration: stop - (start ?? 0) });
            }

            if(outputFormat == 'gif' && outputSize) {
                const width = parseInt(outputSize.split('x')[0]);
                const height = parseInt(outputSize.split('x')[1]);

                Object.assign(video, { size: { height, width }});
            }
        
            if(outputFormat == 'gif' && outputFps) {
                const framerate = parseInt(outputFps);

                Object.assign(video, { framerate });
            }

            if(Object.keys(video).length > 0) {
                Object.assign(output, { video });
            }

            const result: Uint8Array | undefined = await ffmpeg
                .input(input)
                .ouput(output)
                .export()

            setConverting(false);

            if (!result) throw new Error();

            utils.confettiFireworks();
            utils.downloadData(
                result,
                utils.objectFlip(MimeTypeMap)[outputFormat],
                `${props.fileName.split('.')[0]}.${outputFormat}`
            );
        } catch (e) {
            alert('File processing failed!');
        }
    }

    const getVideoStart = () => {
        if(!trimMaskRef.current || !dragareaRef.current) return;

        const margin = parseFloat(
            trimMaskRef.current.style.marginLeft.replace('px', '')
        );
        
        if(isNaN(margin)) return;

        const offset = margin / dragareaRef.current.clientWidth;
        return offset * metadata.duration;
    }

    const getVideoStop = () => {
        if(!dragareaRef.current || !trimMaskRef.current) return;

        const margin = parseFloat(
            trimMaskRef.current.style.marginRight.replace('px', '')
        );
        
        if(isNaN(margin)) return;

        const offset = margin / dragareaRef.current.clientWidth;
        return metadata.duration - offset * metadata.duration;
    }

    const handleOnTogglePlaying = async () => {
        if(!videoRef.current) {
            return;
        }
        if(playing) {
            videoRef.current.pause();
            return;
        }
        const start = getVideoStart();
        if(start && videoRef.current.currentTime < start) {
            videoRef.current.currentTime = start;
            await new Promise((resolve) => {
                videoRef.current?.addEventListener('seeked', () => {
                    resolve(null);
                })
            });
        }
        videoRef.current?.play();
    }

    const handleOnChangeFormat = (event: ChangeEvent<HTMLSelectElement>) => {
        setOutputFormat(event.target.value as Format);
    };

    const handleOnChangeFps = (event: ChangeEvent<HTMLSelectElement>) => {
        setOutputFps(event.target.value);
    };

    const handleOnChangeSize = (event: ChangeEvent<HTMLSelectElement>) => {
        setOutputSize(event.target.value);
    };

    const availableFps = useMemo(() => {
        return [...[15, 24, 25, 30].filter(f => f < metadata.fps), metadata.fps]
    }, [metadata.fps]);

    const availableSizes = useMemo(() => {
        const { width: w, height: h} = metadata;
        const sizes = [1, 1.5, 2, 2.5, 3];
        return sizes.map(m => (
            [Math.round(w/m), Math.round(h/m)]
        )).filter(([w]) => w > 200);
    }, [metadata.height, metadata.width]);

    return (
        <div className="h-full w-full flex flex-col justify-center">
            <Script src="https://cdn.jsdelivr.net/npm/tsparticles-confetti@2.10.1/tsparticles.confetti.bundle.min.js" />
            <div className="relative w-full mt-8 rounded-lg border-[--accents-1] border-[1px] backdrop-blur-lg bg-stone-200/5 overflow-hidden">
                {images.length > 0 && <img className="absolute w-full h-full object-cover -z-10 blur-md brightness-75" src={images[0]} />}
                <video ref={videoRef} className="flex flex-1 w-full aspect-video z-0" src={props.fileUrl} />
                {!previewAvailable && (
                    <div className="absolute inset-0 flex justify-center items-center">
                        <h5 className="text-lg text-white font-medium uppercase mb-4">Preview Not Supported</h5>
                    </div>
                )}
                <div className="absolute flex left-2 right-2 bottom-2 p-2 rounded-lg bg-stone-200/10 backdrop-blur-sm">
                    {previewAvailable && (
                        <button className="flex flex-col pr-4 pl-3 justify-center" onClick={handleOnTogglePlaying}>
                            {
                                !playing && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
                                        <path d="M8.72154 2.54687C6.73333 1.15374 4 2.57604 4 5.00375V18.9965C4 21.4243 6.73336 22.8466 8.72156 21.4534L18.7297 14.4406C20.4229 13.2541 20.4229 10.746 18.7297 9.55955L8.72154 2.54687Z" fill="#FFF"/>
                                    </svg>
                                )
                            }
                            {
                                playing && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
                                        <path d="M3.21799 4.09202C3 4.51984 3 5.0799 3 6.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.0799 21 6.2 21H6.8C7.9201 21 8.48016 21 8.90798 20.782C9.28431 20.5903 9.59027 20.2843 9.78201 19.908C10 19.4802 10 18.9201 10 17.8V6.2C10 5.0799 10 4.51984 9.78201 4.09202C9.59027 3.71569 9.28431 3.40973 8.90798 3.21799C8.48016 3 7.9201 3 6.8 3H6.2C5.0799 3 4.51984 3 4.09202 3.21799C3.71569 3.40973 3.40973 3.71569 3.21799 4.09202Z" fill="#FFF"/>
                                        <path d="M14.218 4.09202C14 4.51984 14 5.0799 14 6.2V17.8C14 18.9201 14 19.4802 14.218 19.908C14.4097 20.2843 14.7157 20.5903 15.092 20.782C15.5198 21 16.0799 21 17.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V6.2C21 5.0799 21 4.51984 20.782 4.09202C20.5903 3.71569 20.2843 3.40973 19.908 3.21799C19.4802 3 18.9201 3 17.8 3H17.2C16.0799 3 15.5198 3 15.092 3.21799C14.7157 3.40973 14.4097 3.71569 14.218 4.09202Z" fill="#FFF"/>
                                    </svg>
                                )
                            }
                        </button>
                    )}
                    <div className="relative flex flex-1 mx-[10px] my-[5px] rounded-md w-full">
                        <div
                            className="flex-1 flex flex-row h-14 pointer-events-none select-none bg-stone-950 rounded-md relative overflow-hidden"
                            ref={timelineRef}
                        >
                            {images.map(url => (
                                <img key={url} src={url} className="h-full object-cover aspect-video" />
                            ))}
                            <div
                                className="absolute top-0 -left-[2px] bottom-0 w-[2px] bg-red-600"
                                ref={cursorRef}
                            />
                        </div>
                        <div 
                            className="absolute inset-0 flex flex-1 pointer-events-none select-none border-yellow-400 border-x-[10px] border-y-[5px] rounded-md items-center space-between px-[3px]"
                            ref={trimMaskRef}
                        >
                            <div 
                                className="absolute flex -left-[10px] w-[10px] top-0 bottom-0 items-center justify-center"
                                ref={leftMaskHandleRef}
                            >
                                <div className="h-5 w-[1.5px] rounded-full bg-black mr-[1px]" />
                                <div className="h-5 w-[1.5px] rounded-full bg-black " />
                            </div>

                            <div 
                                className="absolute flex -right-[10px] w-[10px] top-0 bottom-0 items-center justify-center"
                                ref={rightMaskHandleRef}
                            >
                                <div className="h-5 w-[1.5px] rounded-full bg-black mr-[1px]" />
                                <div className="h-5 w-[1.5px] rounded-full bg-black" />
                            </div>
                        </div>
                        <div className="absolute inset-0 z-10 bg-transparent" ref={dragareaRef} />
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center rounded-lg w-full border-[--accents-2] border-[1px] p-3 mt-4">
                <button 
                    className="border-[--accents-3] text-sm font-medium border-[1px] text-[--accents-7] bg-[--accents-2] px-3 py-1 rounded-md"
                    onClick={props.onCancel}
                >
                    Done
                </button>
                {!converting && (
                    <div className="flex items-center">
                        {
                            outputFormat == 'gif' && (
                                <>
                                    <select
                                        className="text-sm font-semibold text-[--accents-7] bg-transparent px-3 py-1 rounded-md mr-3 focus:outline-none"
                                        value={outputSize ?? [metadata.width, metadata.height].join('x')}
                                        onChange={handleOnChangeSize}
                                    >
                                        {availableSizes.map((key) => (
                                            <option key={key.join('x')} value={key.join('x')} className="text-gray-50 bg-slate-900">
                                                {key.join('x')} Px
                                            </option>
                                        ))}
                                    </select>
                                    <div className="h-5 w-[1px] bg-[--accents-3] mx-2" />
                                    <select
                                        className="text-sm font-semibold text-[--accents-7] bg-transparent px-3 py-1 rounded-md mr-3 focus:outline-none"
                                        value={outputFps ?? metadata.fps.toString()}
                                        onChange={handleOnChangeFps}
                                    >
                                        {availableFps.map((key) => (
                                            <option key={key.toString()} value={key.toString()} className="text-gray-50 bg-slate-900">
                                                {key} FPS
                                            </option>
                                        ))}
                                    </select>
                                    <div className="h-5 w-[1px] bg-[--accents-3] mx-2" />
                                </>
                            )
                        }
                        <select
                            className="text-sm font-semibold text-[--accents-7] bg-transparent px-3 py-1 rounded-md mr-3 focus:outline-none"
                            value={outputFormat}
                            onChange={handleOnChangeFormat}
                        >
                            {SUPPORTED_VIDEO_CONVERSIONS.filter(ext => ext[0] == MimeTypeMap[props.blob.type]).map((key) => (
                                <option key={key[1]} value={key[1]} className="text-gray-50 bg-slate-900">
                                    {key[1].toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <button 
                            className="text-sm font-medium text-stone-50 bg-blue-500 px-3 py-1 rounded-md ml-1"
                            onClick={exportVideo}
                            disabled={converting}
                        >
                            Export
                        </button>
                    </div>
                )}
                {converting && (
                    <div className="flex items-center flex-1 w-full justify-end">
                        <div className="h-2 w-2/5 rounded-full flex bg-stone-500/25">
                            <div
                                className="flex h-full bg-blue-500 rounded-full" 
                                style={{ width: `${progress}%`}}
                            />
                        </div>
                        <div className="mr-3 flex justify-end w-14">
                            <p className="font-semibold">{progress}%</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}