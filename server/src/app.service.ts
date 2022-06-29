import {
  constants,
  promises as fsPromises,
  createWriteStream,
  createReadStream,
  unlinkSync,
} from 'fs';
import { resolve as pathContcat } from 'path';
import { UploadFileDTO, MergeFileDTO, CheckFileDTO } from './upload.dto';
import { HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private segmentDirPath = 'segment';
  private uploadDir = './upload';
  getHello(): string {
    return 'Hello World!';
  }

  async checkExist(fileInfo: CheckFileDTO) {
    await this.checkDir(pathContcat(this.uploadDir));
    const fileName = await this.findFile(fileInfo.hash);
    if (fileName) return `${this.uploadDir}/${fileName}`;
    return false;
  }
  async saveSegment(file: Express.Multer.File, fileInfo: UploadFileDTO) {
    if (!file) throw new HttpException('file not found', 400);
    this.segmentDirPath = this.generateUniqueSegmentDirName(
      fileInfo.name,
      fileInfo.hash,
    );
    await this.checkDir(pathContcat(this.segmentDirPath));
    const fileName = this.generateUniqueSegmentFileName(
      fileInfo.hash,
      fileInfo.index,
      fileInfo.name,
    );
    await fsPromises.writeFile(
      `${this.segmentDirPath}/${fileName}`,
      file.buffer,
    );
  }

  async mergeSegment({ hash, name, limitSize }) {
    // find folder
    this.segmentDirPath = this.generateUniqueSegmentDirName(name, hash);
    const segmentPath = await fsPromises.readdir(this.segmentDirPath);
    await this.checkDir(pathContcat(this.uploadDir));
    const filePath = pathContcat(this.uploadDir, `${hash}-${name}`);
    segmentPath.sort((a, b) => ~~a.split('-')[0] - ~~b.split('-')[0]);
    await this.mergeAllSegment(filePath, segmentPath, limitSize);
    await fsPromises.rmdir(this.segmentDirPath);
  }

  async findFile(beUploadFile: string) {
    const uploadedList = await fsPromises.readdir(this.uploadDir);
    console.log(uploadedList);
    return uploadedList.find((fileName) => {
      console.log({ fileName });
      console.log(fileName.split('-')[0]);
      return fileName.split('-')[0] === beUploadFile;
    });
  }

  async mergeAllSegment(
    filePath: string,
    segmentPath: string[],
    limitSize: number,
  ) {
    const task = segmentPath.map((chunkPath, index) =>
      this.pipeStream(
        pathContcat(this.segmentDirPath, chunkPath),
        createWriteStream(filePath, {
          start: index * limitSize,
        }),
      ),
    );
    return Promise.all(task);
  }
  pipeStream(path: string, writeStream: any): any {
    return new Promise<void>((resolve) => {
      const readStream = createReadStream(path);
      readStream.on('end', () => {
        unlinkSync(path);
        resolve();
      });
      readStream.pipe(writeStream);
    });
  }
  async checkDir(dirPath: string) {
    try {
      // Check if segment directory exists
      await fsPromises.access(dirPath, constants.F_OK);
    } catch (ex) {
      // Create segment directory if not exist
      await fsPromises.mkdir(dirPath, { recursive: true });
    }
  }
  generateUniqueSegmentFileName(
    hash: string,
    index: number,
    name: string,
  ): string {
    // server file name: '{0}-{hash}-{1579419935235}.part'
    return `${index}-{${hash}}-${name}`;
  }
  generateUniqueSegmentDirName(name: string, hash: string): string {
    // segment directory: '{userId}-{hash}-{1579419935235}'
    return `${name}-{${hash}}`;
  }
}
