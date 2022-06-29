import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { UploadFileDTO, MergeFileDTO, CheckFileDTO } from './upload.dto';

const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t));
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDTO,
  ) {
    console.log(uploadFileDto);
    await this.appService.saveSegment(file, uploadFileDto);
    return {
      code: 0,
      message: 'success',
    };
  }

  @Get('check')
  async checkExist(@Query() checkFileDto: CheckFileDTO) {
    const uploadedFile = await this.appService.checkExist(checkFileDto);
    if (uploadedFile)
      return {
        code: 1,
        message: 'file exist',
        file: uploadedFile,
      };
    return {
      code: 0,
    };
  }

  @Post('merge')
  async mergeFile(@Body() mergeFileDto: MergeFileDTO) {
    await sleep(1000);
    await this.appService.mergeSegment(mergeFileDto);
    return {
      code: 0,
      message: 'success',
    };
  }
}
