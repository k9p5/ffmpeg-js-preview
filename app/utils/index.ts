export * from './confetti';

export const showFileDialog = async (accept: string) => {
    return new Promise<File | undefined>((resolve) => {
        // setup input
        const input = document.createElement('input');
        input.type = "file";
        input.accept = accept;
        // listen for changes
        input.onchange = (fileEvent: Event) => {
            const file = (<HTMLInputElement>fileEvent.target)?.files?.[0];
            resolve(file);
        }
        input.click();
    });
}

export const readFile = async (file: File) => {
    return new Promise<Blob | undefined>((resolve) => {
        // setting up the reader
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);

        // read file
        reader.onload = readerEvent => {
            const content = readerEvent?.target?.result;
            if (!content || typeof content == "string") {
                resolve(undefined);
            } else {
                resolve(new Blob([new Uint8Array(content)], { type: file.type }));
            }
        }
    })
}

export const downloadData = (file: Uint8Array, mimeType: string, name: string) => {
    // Create link and download
    const a = document.createElement('a');
    document.head.appendChild(a);
    a.download = name;
    a.href = URL.createObjectURL(
        new Blob([file], { type: mimeType })
    )
    a.click();
}

export const objectFlip = (obj: Object) => {
    return Object.fromEntries(Object.entries(obj).map(a => a.reverse()))
}

export const parseFFmpegMetadata = (data: Record<string, number>) => (msg: string) => {
    if (msg.match(/Duration:/)) {
        const splits = msg.split(',');
        const duration = splits[0].replace(/Duration:/, '').trim();
        Object.assign(data, { duration: Date.parse(`01 Jan 1970 ${duration} GMT`) / 1000 })
    }
    if (msg.match(/Stream #0:0/)) {
        console.log(msg.split(','))
        const splits = msg.split(',');

        for (const split of splits) {
            if (split.match(/[0-9]*x[0-9]*/)) {
                Object.assign(data, { width: parseInt(split.split('x')[0]) });
                Object.assign(data, { height: parseInt(split.split('x')[1]) });
            }
            if (split.match(/fps/)) {
                Object.assign(data, { fps: parseInt(split.replace('fps', '').trim()) });
            }
        }
    }
}
