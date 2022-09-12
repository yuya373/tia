import Zip from "jszip";

const reg = new RegExp(/img src="(?<url>.*)"/);
const logger = message => {
  console.log(message);
  chrome.runtime.sendMessage({ log: true, from: 'eventPage', message });
};

// Listen to messages sent from other parts of the extension.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // onMessage must return "true" if response is async.
  let isResponseAsync = false;

  if (request.popupMounted) {
    console.log('eventPage notified that Popup.tsx has mounted.');
  }

  if (request.urlsReceived) {
    chrome.runtime.sendMessage({ downloadStarted: true });
    logger(`urls Received: ${Object.keys(request)}`);
    const title: string = request.title;
    const urls: Array<string> = request.urls;
    const baseUrl: string = request.baseUrl;
    isResponseAsync = true;
    downloadImages(title, baseUrl, urls, logger)
      .then(() => chrome.runtime.sendMessage({ downloadFinished: true }))
      .catch(e => sendResponse({ error: true, message: e.message })) ;
  }

  return isResponseAsync;
});

const downloadImages = async (title: string, baseUrl: string, urls: Array<string>, logger: (msg: String) => void) => {
  const imageUrls = (await Promise.all(
    urls.map(async (url) => {
      logger(`url: ${url}`);
      const response = await fetch(url);

      const contentType = response.headers.get('Content-Type');
      logger(`contentType: ${contentType}`);
      if (contentType && contentType.startsWith('image')) {
        return url
      }

      const txt = await response.text();
      logger(`txt: ${txt}`);
      const matchResult = txt.match(reg);
      logger(`matchResult: ${matchResult}`);

      if (matchResult) {
        const url = matchResult['groups']['url'];
        logger(`image url: ${url}`);
        return url.replaceAll('&amp;', '&');
      } else {
        return '';
      }
    })
  )).filter(e => e.length > 0);

  const blobs = await Promise.all(imageUrls.map(async (e, i) => {
    const url = new URL(e);
    const parts = url.pathname.split('/');
    const filename = `${i}-` + parts[parts.length - 1];

    logger(`fetching blob [${i + 1}/${imageUrls.length}]: ${filename}, ${url}`);
    const response = await fetch(e);

    logger(`fetching blob [${i + 1}/${imageUrls.length}]: fetched response`);

    const blob = await response.blob();
    logger(`fetched blob [${i + 1}/${imageUrls.length}]: ${filename}, ${url}`);
    chrome.runtime.sendMessage({ progress: true, current: i + 1, all: imageUrls.length });

    return {
      filename,
      url,
      blob,
    }
  }));
  logger(`blobs: ${blobs.length}`);

  const parts = baseUrl.split('/');
  const zipFilename = `${title}_${parts[parts.length - 1]}`;
  const zip = new Zip();
  blobs.forEach(({ blob, filename }) => {
    zip.folder(zipFilename).file(filename, blob);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  logger(`zip file generated: ${url}, ${zipFilename}`);

  chrome.downloads.download(
    {url, conflictAction: 'overwrite', filename: `${zipFilename}.zip`},
    (downloadId) => {
      if (downloadId == null) {
        logger(`download failed: ${chrome.runtime.lastError.message}`)
      }
    });
}
