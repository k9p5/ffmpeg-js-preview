
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
