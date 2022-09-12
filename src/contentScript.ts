chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('contentScript', request);

  // onMessage must return "true" if response is async.
  let isResponseAsync = false;

  if (request.popupMounted) {
    console.log('eventPage notified that Popup.tsx has mounted.');
  }

  if (request.scrapeStarted) {
    const urls = gatherUrls();
    const title = document.querySelector('h1.post-title').textContent;
    sendResponse({ baseUrl: location.href, urls, title });
  }


  return isResponseAsync;
});

const gatherUrls = (): Array<{ planName: string; urls: Array<string> }> => {
  const contents = document.querySelectorAll('post-content');
  const baseUrl = location.href;

  const plans = Array.from(contents).map((e) => {
    const planName = e.querySelector('.post-content-for strong').textContent;
    const imgs = e.querySelectorAll('.post-content-body .image-thumbnails  img')
    console.log(planName, baseUrl);
    const urls = Array.from(imgs).map((img: HTMLImageElement) => {
      const url = new URL(img.src);
      const { pathname } = url;
      const parts = pathname.split('/');
      return `${baseUrl}/${parts[2]}/${parts[4]}`
    });

    return {
      planName,
      urls,
    };
  })

  const headerImgs = document.querySelectorAll('.the-post .post-thumbnail img');
  const headerUrls = Array.from(headerImgs).map((img: HTMLImageElement) => {
    return img.src;
  });

  console.log('headerUrls', headerUrls);

  return [{ planName: 'ヘッダー', urls: headerUrls }, ...plans];
}
