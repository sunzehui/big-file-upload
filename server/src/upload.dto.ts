export interface UploadFileDTO {
  size: string;
  name: string;
  type: string;
  index: number;
  hash: string;
}
export interface MergeFileDTO {
  hash: string;
  name: string;
  limitSize: number;
}
export interface CheckFileDTO {
  hash: string;
}
