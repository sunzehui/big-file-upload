import "tailwindcss/tailwind.css";
import "./css/style.css";
import axios from "axios";
import SparkMD5 from "spark-md5";
const uploadBtn = document.querySelector(".upload-btn");
const fileChoise = document.querySelector("#file") as HTMLInputElement;
const fileStatus = document.querySelector(".title") as HTMLSpanElement;
const progress = document.querySelector("progress") as HTMLProgressElement;
const limitSize = 10 * 1024 * 1024;
let uploadedSize = 0;

const uploadFile = (fd: FormData) => {
  return axios.post("/api/upload", fd);
};
const mergeFile = (fileInfo: IMergeFile) => {
  return axios.post("/api/merge", {
    ...fileInfo,
  });
};

const checkExist = async (hash: string): Promise<Boolean> => {
  const { data } = await axios.get("/api/check", {
    params: {
      hash,
    },
  });
  return !!data.code;
};

interface IThunk {
  file: Blob;
  size: number;
  name: string;
  type: string;
  index: number;
}
type ThunkList = IThunk[];

export interface IMergeFile {
  hash: string;
  name: string;
  limitSize: number;
}

const createFormData = ({
  file,
  size,
  name,
  type,
  hash,
  index,
}: IThunk & { hash: string }) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("size", "" + size);
  fd.append("name", name);
  fd.append("type", type);
  fd.append("hash", hash);
  fd.append("index", "" + index);
  return fd;
};
const calcHash = (thunkList: ThunkList): Promise<string> => {
  const spark = new SparkMD5.ArrayBuffer();
  return new Promise((resolve, reject) => {
    const calc = (index: number) => {
      const fr = new FileReader();
      fr.readAsArrayBuffer(thunkList[index].file);
      fr.onload = (ev: ProgressEvent<FileReader>) => {
        const buffer = ev.target.result as ArrayBuffer;
        spark.append(buffer);
        console.log(index, thunkList.length);
        if (index === thunkList.length - 1) {
          resolve(spark.end());
          return;
        }
        calc(++index);
      };
      fr.onerror = reject;
    };
    calc(0);
  });
};
uploadBtn.addEventListener("click", async (evt: InputEvent) => {
  const {
    files: [file],
  } = fileChoise;
  fileStatus.innerText = "已选择" + file.name;

  if (!file) {
    fileStatus.innerText = "未选择文件";
    return;
  }
  progress.max = file.size;
  const thunkList = createThunkList(file);

  // // 计算所有文件碎片
  const hash = await calcHash(thunkList);
  const isExist = await checkExist(hash);
  if (isExist) {
    progress.value = file.size;
    fileStatus.innerText = "上传成功";
    return;
  }
  const uploadTask = createUploadTask(thunkList, hash);
  await Promise.all(uploadTask);

  await mergeFile({ hash, name: file.name, limitSize });

  fileStatus.innerText = "上传成功";
});
const createUploadTask = (thunkList: ThunkList, hash: string) =>
  thunkList.map(
    (thunk) =>
      new Promise<void>((resolve, reject) => {
        uploadFile(createFormData({ ...thunk, hash })).then(() => {
          uploadedSize += +thunk.size;
          progress.value = uploadedSize;
          resolve();
        }, reject);
      })
  );

function createThunkList(file: File) {
  const thunkList = [];
  const thunkSize = Math.ceil(file.size / limitSize);
  for (let i = 0; i < thunkSize; i++) {
    const fileChunk = file.slice(limitSize * i, limitSize * (i + 1));
    thunkList.push({
      file: fileChunk,
      size: limitSize,
      name: file.name,
      type: file.type,
      index: i,
    });
  }
  return thunkList;
}
