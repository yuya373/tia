chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('contentScript', request);

  // onMessage must return "true" if response is async.
  let isResponseAsync = false;

  if (request.popupMounted) {
    console.log('eventPage notified that Popup.tsx has mounted.');
  }

  if (request.scrapeStarted) {
    const urls = gatherUrls();
    sendResponse({ baseUrl: location.href, urls });
  }


  return isResponseAsync;
});

const gatherUrls = () => {
  const imgs = document.querySelectorAll('.post-content .post-content-body .image-thumbnails  img')
  const baseUrl = location.href;
  console.log(baseUrl);

  const urls = Array.from(imgs).map((img: HTMLImageElement) => {
    const url = new URL(img.src);
    const { pathname } = url;
    const parts = pathname.split('/');
    return `${baseUrl}/${parts[2]}/${parts[4]}`
  });

  return urls;
}
