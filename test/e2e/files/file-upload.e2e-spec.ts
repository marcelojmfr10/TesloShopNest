import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

import { AppModule } from '../../../src/app.module';
import { join } from 'path';
import { existsSync, fstat, unlinkSync } from 'fs';

describe('FilesModule (e2e)', () => {
    let app: INestApplication;
    const testImagePath = join(__dirname, 'test-image.jpg');

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        await app.init();

    });

    afterEach(async () => {
        await app.close();
    });

    it('should throw a 400 error if no file selected', async () => {
        const response = await request(app.getHttpServer()).post('/files/product');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'Make sure that the file is an image',
            error: 'Bad Request',
            statusCode: 400
        });
    });

    it('should throw a 400 error if the file selected is not an image', async () => {
        const response = await request(app.getHttpServer())
            .post('/files/product')
            .attach('file', Buffer.from('this is a test file'), 'test.txt');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'Make sure that the file is an image',
            error: 'Bad Request',
            statusCode: 400
        });
    });

    it('should upload image file successfully', async () => {
        const response = await request(app.getHttpServer())
            .post('/files/product')
            .attach('file', testImagePath);

        const fileName = response.body.fileName;

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('secureUrl');
        expect(response.body).toHaveProperty('fileName');
        expect(response.body.secureUrl).toContain('/files/product');

        const filePath = join(__dirname, '../../../static/products', fileName);
        const fileExists = existsSync(filePath);

        expect(fileExists).toBeTruthy();
        unlinkSync(filePath);
    });

    it('should throw a 400 error if the requested image does not exists', async () => {
        const response = await request(app.getHttpServer())
            .get('/files/product/no-image.jpg');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'No product found with image no-image.jpg',
            error: 'Bad Request',
            statusCode: 400
        });
    });

});

