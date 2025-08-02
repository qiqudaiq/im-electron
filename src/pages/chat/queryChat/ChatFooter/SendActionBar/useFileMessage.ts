import { MessageItem } from "@openim/wasm-client-sdk";
import { v4 as uuidV4 } from "uuid";
import { message } from "antd";
import { t } from "i18next";

import { IMSDK } from "@/layout/MainContentWrap";
import { base64toFile, canSendImageTypeList } from "@/utils/common";
import { FILE_SIZE_LIMITS, FILE_SIZE_LIMITS_TEXT } from "@/constants/im";

export interface FileWithPath extends File {
  path?: string;
}

export function useFileMessage() {
  const checkFileSize = (file: FileWithPath, type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE'): boolean => {
    if (file.size > FILE_SIZE_LIMITS[type]) {
      message.error(t('toast.fileSizeLimit', { size: FILE_SIZE_LIMITS_TEXT[type] }));
      return false;
    }
    return true;
  };

  const getImageMessage = async (file: FileWithPath) => {
    if (!checkFileSize(file, 'IMAGE')) {
      throw new Error('File size exceeds limit');
    }

    const { width, height } = await getPicInfo(file);
    const baseInfo = {
      uuid: uuidV4(),
      type: file.type,
      size: file.size,
      width,
      height,
      url: URL.createObjectURL(file),
    };

    if (window.electronAPI) {
      // https://dev-api.freechat.diy/api/object/61760107327260591889/msg_picture_0d3c7a31ee44251483949b94ef55e253.jpg?height=640&type=image&width=640
      // const baseInfo = {
      //     uuid: uuidV4(),
      //     type: file.type,
      //     size: file.size,
      //     width,
      //     height,
      //     url: 'https://dev-api.freechat.diy/api/object/61760107327260591889/msg_picture_0d3c7a31ee44251483949b94ef55e253.jpg?height=640&type=image&width=640',
      //   };

      //  const options = {
      //     sourcePicture: baseInfo,
      //     bigPicture: baseInfo,
      //     snapshotPicture: baseInfo,
      //     sourcePath: "",
      //     file,
      //   };
      const filePath = await window.electronAPI?.saveFileToDisk({
        sync: true,
        file,
      });
      const imageMessage = (await IMSDK.createImageMessageFromFullPath(filePath))
        .data;
      imageMessage.pictureElem!.sourcePicture.url = baseInfo.url;
      return imageMessage;
    }
    const options = {
      sourcePicture: baseInfo,
      bigPicture: baseInfo,
      snapshotPicture: baseInfo,
      sourcePath: "",
      file,
    };

    return (await IMSDK.createImageMessageByFile(options)).data;
  };

  const getVideoMessage = async (file: FileWithPath, snapShotFile: FileWithPath) => {
    if (!checkFileSize(file, 'VIDEO')) {
      throw new Error('File size exceeds limit');
    }

    const { width, height } = await getPicInfo(snapShotFile);

    if (window.electronAPI) {
      const snapshotPath =
        (await window.electronAPI?.saveFileToDisk({
          sync: true,
          file: snapShotFile,
        })) || `/${snapShotFile.name}`;

      const videoMessage = (
        await IMSDK.createVideoMessageFromFullPath({
          videoPath: file.path!,
          snapshotPath,
          videoType: file.type,
          duration: await getMediaDuration(URL.createObjectURL(file)),
        })
      ).data;
      videoMessage.videoElem!.snapshotUrl = URL.createObjectURL(snapShotFile);
      return videoMessage;
    }
    const options = {
      videoFile: file,
      snapshotFile: snapShotFile,
      videoPath: "",
      duration: await getMediaDuration(URL.createObjectURL(file)),
      videoType: file.type,
      snapshotPath: "",
      videoUUID: uuidV4(),
      videoUrl: "",
      videoSize: file.size,
      snapshotUUID: uuidV4(),
      snapshotSize: snapShotFile.size,
      snapshotUrl: URL.createObjectURL(snapShotFile),
      snapshotWidth: width,
      snapshotHeight: height,
      snapShotType: snapShotFile.type,
    };
    return (await IMSDK.createVideoMessageByFile(options)).data;
  };

  const getFileMessage = async (file: FileWithPath) => {
    if (file.type.startsWith('audio/')) {
      if (!checkFileSize(file, 'AUDIO')) {
        throw new Error('File size exceeds limit');
      }
    } else {
      if (!checkFileSize(file, 'FILE')) {
        throw new Error('File size exceeds limit');
      }
    }

    if (window.electronAPI) {
      return (
        await IMSDK.createFileMessageFromFullPath({
          filePath: file.path!,
          fileName: file.name,
        })
      ).data;
    }
    const options = {
      file,
      filePath: "",
      fileName: file.name,
      uuid: uuidV4(),
      sourceUrl: "",
      fileSize: file.size,
      fileType: file.type,
    };
    return (await IMSDK.createFileMessageByFile(options)).data;
  };

  const createFileMessage = async (file: FileWithPath): Promise<MessageItem> => {
    const isImage = canSendImageTypeList.includes(getFileType(file.name));
    const isVideo = file.type.includes(window.electronAPI ? "video" : "mp4");
    if (isImage) {
      return await getImageMessage(file);
    }
    if (isVideo) {
      const snapShotFile = await getVideoSnshotFile(file);
      return await getVideoMessage(file, snapShotFile);
    }
    return await getFileMessage(file);
  };

  const getFileType = (name: string) => {
    const idx = name.lastIndexOf(".");
    return name.slice(idx + 1);
  };

  const getPicInfo = (file: File): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const _URL = window.URL || window.webkitURL;
      const img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.src = _URL.createObjectURL(file);
    });

  const getVideoSnshotFile = (file: File): Promise<File> => {
    const url = URL.createObjectURL(file);
    return new Promise((reslove, reject) => {
      const video = document.createElement("VIDEO") as HTMLVideoElement;
      video.setAttribute("autoplay", "autoplay");
      video.setAttribute("muted", "muted");
      video.innerHTML = `<source src="${url}" type="audio/mp4">`;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      video.addEventListener("canplay", () => {
        const anw = document.createAttribute("width");
        //@ts-ignore
        anw.nodeValue = video.videoWidth;
        const anh = document.createAttribute("height");
        //@ts-ignore
        anh.nodeValue = video.videoHeight;
        canvas.setAttributeNode(anw);
        canvas.setAttributeNode(anh);
        //@ts-ignore
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const base64 = canvas.toDataURL("image/png");
        //@ts-ignore
        video.pause();
        const file = base64toFile(base64);
        reslove(file);
      });
    });
  };

  const getMediaDuration = (path: string): Promise<number> =>
    new Promise((resolve) => {
      const vel = new Audio(path);
      vel.onloadedmetadata = function () {
        resolve(Number(vel.duration.toFixed()));
      };
    });

  return {
    getImageMessage,
    getVideoMessage,
    getFileMessage,
    createFileMessage,
    getVideoSnshotFile,
  };
}
