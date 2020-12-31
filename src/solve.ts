import axios from "axios";
import * as https from "https";
import { Page } from "puppeteer";

function rdn(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

async function solve(page: Page) {
  try {
    await page.waitForFunction(() => {
      const iframe = document.querySelector('iframe[src*="api2/anchor"]');
      if (!iframe) return false;
      //@ts-ignore
      return !!iframe.contentWindow.document.querySelector("#recaptcha-anchor");
    });

    let frames = await page.frames();
    const recaptchaFrame = frames.find((frame) =>
      frame.url().includes("api2/anchor")
    );

    //@ts-ignore
    const checkbox = await recaptchaFrame.$("#recaptcha-anchor");
    //@ts-ignore

    await checkbox.click({ delay: rdn(30, 150) });

    await page.waitForFunction(() => {
      const iframe = document.querySelector('iframe[src*="api2/bframe"]');
      if (!iframe) return false;

      //@ts-ignore
      const img = iframe.contentWindow.document.querySelector(
        ".rc-image-tile-wrapper img"
      );
      return img && img.complete;
    });

    frames = await page.frames();
    const imageFrame = frames.find((frame) =>
      frame.url().includes("api2/bframe")
    );
    //@ts-ignore
    const audioButton = await imageFrame.$("#recaptcha-audio-button");

    //@ts-ignore
    await audioButton.click({ delay: rdn(30, 150) });
    while (true) {
      try {
        await page.waitForFunction(
          () => {
            const iframe = document.querySelector('iframe[src*="api2/bframe"]');
            if (!iframe) return false;

            //@ts-ignore
            return !!iframe.contentWindow.document.querySelector(
              ".rc-audiochallenge-tdownload-link"
            );
          },
          { timeout: 1000 }
        );
      } catch (error) {
        console.log("download link not found");
        return null;
      }

      const audioLink = await page.evaluate(() => {
        const iframe = document.querySelector('iframe[src*="api2/bframe"]');
        //@ts-ignore
        return iframe.contentWindow.document.querySelector("#audio-source").src;
      });

      const audioBytes = await page.evaluate((audioLink) => {
        return (async () => {
          const response = await window.fetch(audioLink);
          const buffer = await response.arrayBuffer();
          return Array.from(new Uint8Array(buffer));
        })();
      }, audioLink);

      const httsAgent = new https.Agent({ rejectUnauthorized: false });
      //@ts-ignore
      const response = await axios({
        httsAgent,
        method: "post",
        url: "https://api.wit.ai/speech",
        data: new Uint8Array(audioBytes).buffer,
        headers: {
          Authorization: "Bearer JVHWCNWJLWLGN6MFALYLHAPKUFHMNTAC",
          "Content-Type": "audio/mpeg3",
        },
      });

      const audioTranscript = response.data.text.trim();
      //@ts-ignore
      const input = await imageFrame.$("#audio-response");
      //@ts-ignore
      await input.click({ delay: rdn(30, 150) });
      //@ts-ignore
      await input.type(audioTranscript, { delay: rdn(30, 75) });
      //@ts-ignore
      const verifyButton = await imageFrame.$("#recaptcha-verify-button");
      //@ts-ignore
      await verifyButton.click({ delay: rdn(30, 150) });

      try {
        await page.waitForFunction(
          () => {
            const iframe = document.querySelector('iframe[src*="api2/anchor"]');
            if (!iframe) return false;
            //@ts-ignore
            return !!iframe.contentWindow.document.querySelector(
              '#recaptcha-anchor[aria-checked="true"]'
            );
          },
          { timeout: 1000 }
        );

        return page.evaluate(
          //@ts-ignore
          () => document.getElementById("g-recaptcha-response").value
        );
      } catch (error) {
        console.log("multiple audio");
      }
    }
  } catch (e) {
    console.log(e);
    return null;
  }
}

export default solve;
