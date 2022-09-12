import React, { useEffect, useState } from "react";
import "./Popup.css";

// type Status = 'gatherUrlsStarted' | 'gatherUrlsFinished' | 'downloadingStarted' | 'downloadingFinished' | 'idle';

export default function Popup() {
  const [plans, setPlans] = useState<Array<{ planName: string; urls: Array<string> }>>([]);
  const [checkedPlans, setCheckedPlans] = useState<Array<string>>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [title, setTitle] = useState('');
  // const [status, setStatus] = useState<Status>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, all: 0 });

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

  const onClickScrape = () => {
    setProgress({ current: 0, all: 0 });
    setIsLoading(true);
    setPlans([]);
    setCheckedPlans([]);
    setBaseUrl('');
    setTitle('');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length <= 0) {
        setIsLoading(false);
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { scrapeStarted: true }, (response) => {
        setIsLoading(false);
        setPlans(response.urls);
        setCheckedPlans(response.urls.filter((_, i, ary) => i === 0 || i === ary.length - 1).map(e => e.planName));
        setBaseUrl(response.baseUrl);
        setTitle(response.title);
      });
    })
  }

  const onClickPlan = ({ planName }) => {
    setCheckedPlans((plans) => {
      if (plans.includes(planName)) {
        return plans.filter(e => e !== planName);
      } else {
        return [planName, ...plans];
      }
    });
  }

  const onClickDownload = () => {
    const urls = plans.filter(e => checkedPlans.includes(e.planName)).reduce((a, e) => [...a, ...e.urls], []);
    chrome.runtime.sendMessage({ urlsReceived: true, baseUrl: baseUrl, urls: urls, title });
  };

  return (
    <div className="popupContainer">
      <button onClick={onClickScrape}>
        Scrape
      </button>
      <div className="content">
        <h1>{title}</h1>
        {plans.map((e) => (
          <div className="planCheckBox">
            <input
              type='checkbox'
              id={e.planName}
              name='plans'
              checked={checkedPlans.includes(e.planName)}
              onChange={() => onClickPlan(e)}
            />
            <label htmlFor={e.planName}>{e.planName}</label>
          </div>
        ))}
      </div>
      <button
        disabled={checkedPlans.length <= 0}
        onClick={onClickDownload}
      >
        Download
      </button>
      <p>
        {isDownloading ? `Downloading (${progress.current}/${progress.all})...` : `Downloaded ${progress.all} images.`}
      </p>
      <p>
        {errorMessage}
      </p>
    </div>
  );
}
