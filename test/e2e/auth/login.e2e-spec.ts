import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../../../src/app.module';
import { Repository } from 'typeorm';
import { User } from '../../../src/auth/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

const testingUser = {
  email: 'testing.user@google.com',
  password: 'Abc12345',
  fullName: 'Testing user',
};

const testingAdminUser = {
  email: 'testing.admin@google.com',
  password: 'Abc12345',
  fullName: 'Testing admin',
};

describe('Auth - Login', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;

  beforeAll(async () => {
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

    userRepository = app.get<Repository<User>>(getRepositoryToken(User));

    userRepository.delete({ email: testingUser.email });
    userRepository.delete({ email: testingAdminUser.email });

    const responseUser = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testingUser);
    const responseAdmin = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testingAdminUser);

    await userRepository.update(
      { email: testingAdminUser.email },
      { roles: ['admin'] },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/login (POST) - should throw 400 if no body', async () => {
    // return request(app.getHttpServer())
    //   .get('/')
    //   .expect(404);

    const errorMessages = [
      'email must be an email',
      'email must be a string',
      'The password must have a uppercase, lowercase letter and a number',
      'password must be shorter than or equal to 50 characters',
      'password must be longer than or equal to 6 characters',
      'password must be a string',
    ];

    const response = await request(app.getHttpServer()).post('/auth/login');
    expect(response.status).toBe(400);

    errorMessages.forEach((message) => {
      expect(response.body.message).toContain(message);
    });
  });

  it('/auth/login (POST) - wrong credentials - email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'correo@nada.com', password: testingUser.password });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Credentials are not valid (email)',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });

  it('/auth/login (POST) - wrong credentials - password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testingUser.email, password: 'Abc1234' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Credentials are not valid (password)',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });

  it('/auth/login (POST) - valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testingUser.email, password: testingUser.password });

    console.log(response.body);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      email: testingUser.email,
      password: expect.any(String),
      token: expect.any(String),
    });
  });
});
