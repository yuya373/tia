import React, { useEffect, useState } from "react";
import "./Popup.css";

// type Status = 'gatherUrlsStarted' | 'gatherUrlsFinished' | 'downloadingStarted' | 'downloadingFinished' | 'idle';

export default function Popup() {
  const [urls, setUrls] = useState([]);
  // const [status, setStatus] = useState<Status>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, all: 0});

  useEffect(() => {
    // Example of how to send a message to eventPage.ts.
    chrome.runtime.sendMessage({ popupMounted: true });
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('request', request);

      if (request.error) {
        setErrorMessage(request.message);
      }

      if (request.log) {
        console.log(`[Log] ${request.from}: ${request.message}`);
      }

      if (request.downloadStarted) {
        setIsDownloading(true);
      }

      if (request.downloadFinished) {
        setIsDownloading(false);
      }

      if (request.progress) {
        setProgress({ current: request.current, all: request.all });
      }
    })
  }, []);

  const handleOnClick = () => {
    setProgress({ current: 0, all: 0 });
    setIsLoading(true);
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length <= 0) {
        setIsLoading(false);
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { scrapeStarted: true }, (response) => {
        setIsLoading(false);
        setUrls(response.urls);
        chrome.runtime.sendMessage({ urlsReceived: true, baseUrl: response.baseUrl, urls: response.urls });
      });
    })
  }


  return (
    <div className="popupContainer">
      <button onClick={handleOnClick}>
        Go
      </button>
      <p>
        { isLoading ? `Loading...` : `${urls.length} urls.`}
      </p>
      <p>
        { isDownloading ? `Downloading (${progress.current}/${progress.all})...` : `Downloaded ${progress.all} images.`}
      </p>
      <p>
        {errorMessage}
      </p>
    </div>
  );
}
