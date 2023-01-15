const create = async() => {
    let ffmpeg = undefined;
    const settings = {
        corePath: chrome.runtime.getURL("/src/vendor/ffmpeg-core.js"),
    };
    ffmpeg = await FFmpeg.createFFmpeg(settings);
    await ffmpeg.load();
    return ffmpeg;
};


const get_reddit = async(link) => {
    try {
        const response = await fetch(link + ".json");
        const data = await response.json();
        let audio_url = data[0].data
            ?.children[0].data
                ?.secure_media
                    ?.reddit_video
                        ?.fallback_url
        let normal_url = audio_url.replace("?source=fallback", "")
        audio_url = audio_url.replace(/DASH_[0-9]+/gm, "DASH_audio")
        audio_url = audio_url.replace("?source=fallback", "")
        if (!audio_url) {
            return "Error"
        }
        return [normal_url, audio_url]
    } catch (error) {
        return "Error"
    }

}

window.onload = function(event){
    chrome.tabs.onUpdated.addListener(function () {
        chrome.contextMenus.create({
            "documentUrlPatterns": ["*://*.reddit.com/r/*/comments/*/*/"],
            title: "Download and save the video", id: "menu1", contexts: ["video"]});
    });

}


// chrome.runtime.onInstalled.addListener(function () {
//     chrome.contextMenus.create({
//         "documentUrlPatterns": ["*://*.reddit.com/r/*/comments/*/*/"],
//         title: "Download and save the video", id: "menu1", contexts: ["video"]});
// });

async function saveAs(blob, fileName) {
    var url = window.URL.createObjectURL(blob);
    var anchorElem = document.createElement("a");
    anchorElem.style = "display: none";
    anchorElem.href = url;
    anchorElem.download = fileName;

    document.body.appendChild(anchorElem);
    anchorElem.click();

    document.body.removeChild(anchorElem);

    // On Edge, revokeObjectURL should be called only after
    // a.click() has completed, atleast on EdgeHTML 15.15048
    setTimeout(async function() {
        window.URL.revokeObjectURL(url);
    
    
        chrome.contextMenus.update('menu1', {
            title: "Download and save the video",
            enabled: true
        });

        // setTimeout(() => {
        //     chrome.runtime.reload();
        // }, 3000);
        

    }, 1000);
}

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
    chrome.contextMenus.update('menu1', {
        title:"Downloading the video.",
        enabled: false
    });
        let url_link = info.pageUrl
        let res = await get_reddit(url_link)
        const ffmpeg = await create();
        let { fetchFile } = FFmpeg;
        ffmpeg.FS('writeFile', 'video.mp4', await fetchFile(res[0]));
        ffmpeg.FS('writeFile', 'audio.mp4', await fetchFile(res[1]));
        await ffmpeg.run('-i', 'video.mp4', '-i', 'audio.mp4', '-c', 'copy', 'output.mp4');
        let data = await ffmpeg.FS('readFile', 'output.mp4');
        let byteArray  = new Uint8Array(data.buffer);
        var blob1 = new Blob([byteArray], {type: "application/octet-stream"});
        var fileName1 = "killme.mp4";
        await saveAs(blob1, fileName1)

        
    });
