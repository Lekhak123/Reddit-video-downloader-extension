/* Enable/Disable the context menu*/
const enableContextMenu = (Menustatus) => {
    if (Menustatus) {
        return chrome
            .contextMenus
            .update('Reddit_video_downloader', {
                title: "Download",
                enabled: true
            });
    } else {
        return chrome
            .contextMenus
            .update('Reddit_video_downloader', {
                title: "Downloading the video.",
                enabled: false
            });
    };
};

/* Get the reddit video and audio link from the video post url */
const get_reddit = async(link) => {
    try {
        let response = await fetch(`${link}.json`);
        let data = await response.json();
        let audio_url = data[0].data
            ?.children[0].data
                ?.secure_media
                    ?.reddit_video
                        ?.fallback_url;
        let normal_url = audio_url
            ?.replace("?source=fallback", "");
        audio_url = audio_url
            ?.replace(/DASH_[0-9]+/gm, "DASH_AUDIO_128");
        audio_url = audio_url
            ?.replace("?source=fallback", "");
        response,
        data = undefined;
        return [normal_url, audio_url]
    } catch (error) {
        throw new Error("Error occured while downloading the reddit video.");
    };
};

var contextMenuItem = {
    documentUrlPatterns: ["*://*.reddit.com/r/*/comments/*/*/"],
    title: "Download",
    id: "Reddit_video_downloader",
    contexts: ["video"]
};

/* Initialize the context menu */
chrome
    .runtime
    .onInstalled
    .addListener(function () {
        chrome
            .contextMenus
            .create(contextMenuItem)
    });

chrome
    .runtime
    .onStartup
    .addListener(function () {
        chrome
            .contextMenus
            .create(contextMenuItem);
    });

/* Download the reddit video after processing is complete */
async function saveAs(blob, fileName) {
    try {
        let url = window
            .URL
            .createObjectURL(blob);
        let anchorElem = document.createElement("a");
        anchorElem.style = "display: none";
        anchorElem.href = url;
        anchorElem.download = fileName;
        document
            .body
            .appendChild(anchorElem);
        anchorElem.click();
        document
            .body
            .removeChild(anchorElem);
        anchorElem,
        url = undefined;
    } catch (error) {
        throw new Error("Error occured while saving the video.");
    };
};

var ffmpegObject = {
    ffmpeg: undefined,
    fetchFile: undefined,
    chromeObject: undefined
};

const saveChromeObject = async(chrome) => {
    ffmpegObject.chromeObject = chrome;
    return;
};

/* Initialize ffmpeg and save it to ffmpegObject */
const initializeFFmpeg = async() => {
    if (!(ffmpegObject.chromeObject)) {
        console.log("herere")
        throw new Error("Chrome object not initialized.");
    };
    const settings = {
        corePath: chrome
            .runtime
            .getURL('/src/vendor/ffmpeg-core.js')
    };
    ffmpegObject.ffmpeg = await FFmpeg.createFFmpeg(settings);
    await ffmpegObject
        .ffmpeg
        .load();
    let {fetchFile} = FFmpeg;
    ffmpegObject.fetchFile = fetchFile; // Assign the fetchFile function
    return;
};

/* Remove the recently saved raw video, audio, and output video from ffmpeg memory */
const clearFFmpegMemory = () => {
    ffmpegObject
        .ffmpeg
        .FS
        .unlink('video.mp4');
    ffmpegObject
        .ffmpeg
        .FS
        .unlink('audio.mp4');
    ffmpegObject
        .ffmpeg
        .FS
        .unlink('output.mp4');
    return;
};

/* Generate the output video from the raw video and audio using ffmpeg */
const processVideo = async(videomp4, audiomp4, fetchFile) => {
    try {
        ffmpegObject
            .ffmpeg
            .FS('writeFile', 'video.mp4', await fetchFile(videomp4));
        ffmpegObject
            .ffmpeg
            .FS('writeFile', 'audio.mp4', await fetchFile(audiomp4));
        await ffmpegObject
            .ffmpeg
            .run('-i', 'video.mp4', '-i', 'audio.mp4', '-c', 'copy', 'output.mp4');
        let data = await ffmpegObject
            .ffmpeg
            .FS('readFile', 'output.mp4');
        let byteArray = new Uint8Array(data.buffer);
        let blob1 = new Blob([byteArray], {type: "application/octet-stream"});
        let fileName1 = "download.mp4";
        saveAs(blob1, fileName1);
        data,
        byteArray,
        blob1 = undefined;
        return;
    } catch (error) {
        throw new Error("Error occured while processing the video.");
    };
};

chrome
    .contextMenus
    .onClicked
    .addListener(async function (info) {
        if (!(info
            ?.menuItemId == "Reddit_video_downloader")) {
            return;
        };
        try {
            if (!(ffmpegObject
                ?.chromeObject)) {
                saveChromeObject(chrome);
            };
            if (!(ffmpegObject.ffmpeg)) {
                await initializeFFmpeg();
            };
            enableContextMenu(false);
            let url_link = info.pageUrl;
            let res = await get_reddit(url_link);
            let fetchFile = ffmpegObject
                ?.fetchFile;
            await processVideo(res[0], res[1], fetchFile);
            url_link,
            res = undefined;
            enableContextMenu(true);
            clearFFmpegMemory();
        } catch (error) {
            enableContextMenu(true);
        };
    });
