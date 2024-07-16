import { Test } from '@nestjs/testing';
import * as pactum from 'pactum';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthDto } from 'src/auth/dto';
import { EditUserDto } from 'src/user/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true }),
    );

    await app.init();
    await app.listen(3333);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();

    pactum.request.setBaseUrl('http://localhost:3333');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test@gmail.com',
      password: '123456',
    };

    describe('Signup', () => {
      it('should throw if email is invalid', async () => {
        await pactum
          .spec()
          .post('/auth/signup')
          .withBody({ ...dto, email: 'test' })
          .expectStatus(400);
      });

      it('should throw if password is empty', async () => {
        const { password, ...dtoWithoutPassword } = dto;
        await pactum
          .spec()
          .post('/auth/signup')
          .withBody(dtoWithoutPassword)
          .expectStatus(400);
      });

      it('should throw if no body is provided', async () => {
        await pactum
          .spec()
          .post('/auth/signup')
          .expectStatus(400);
      });

      it('should signup', async () => {
        await pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
    });

    describe('Signin', () => {
      it('should throw if email is invalid', async () => {
        await pactum
          .spec()
          .post('/auth/signin')
          .withBody({ ...dto, email: 'test' })
          .expectStatus(400);
      });

      it('should throw if password is empty', async () => {
        const { password, ...dtoWithoutPassword } = dto;
        await pactum
          .spec()
          .post('/auth/signin')
          .withBody(dtoWithoutPassword)
          .expectStatus(400);
      });

      it('should throw if no body is provided', async () => {
        await pactum
          .spec()
          .post('/auth/signin')
          .expectStatus(400);
      });

      it('should signin', async () => {
        await pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAccessToken', 'access_token');
      });
    });
  });

  describe('User', () => {
    describe('Get me', () => {
      it('should return the current user', async () => {
        await pactum
          .spec()
          .get('/users/me')
          .withHeaders({
            Authorization: 'Bearer $S{userAccessToken}',
          })
          .expectStatus(200);
      });
    });

    describe('Edit user', () => {
      const dto: EditUserDto = {
        email: 'test@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      it('should edit the current user', async () => {
        await pactum
          .spec()
          .patch('/users')
          .withHeaders({
            Authorization: 'Bearer $S{userAccessToken}',
          })
          .withBody(dto)
          .expectStatus(200)
          .expectJsonLike({
            ...dto,
          });
      });
    });
  });

  describe('Bookmarks', () => {
    const dto = {
      title: 'Test',
      description: 'Test description',
      link: 'https://test.com',
    };

    describe('Create bookmark', () => {
      it('should create a bookmark', async () => {
        await pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAccessToken}',
          })
          .withBody(dto)
          .expectStatus(201)
          .expectJsonLike({
            ...dto,
          })
          .stores('bookmarkId', 'id');
      });
    });

    describe('Get bookmarks', () => {
      it('should return bookmarks', async () => {
        await pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAccessToken}',
          })
          .expectStatus(200)
          .expectJsonLike([{
            ...dto,
          }]);
      });
    });

    describe('Get bookmark by id', () => {
      it('should return a bookmark', async () => {
        await pactum
          .spec()
          .get('/bookmarks/$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAccessToken}',
          })
          .expectStatus(200)
          .expectJsonLike({
            ...dto,
          });
      });
    });

    describe('Edit bookmark by id', () => {
      const dto = {
        title: 'new test',
      };

      it('should edit a bookmark', async () => {
        await pactum
          .spec()
          .patch('/bookmarks/$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAccessToken}',
          })
          .withBody(dto)
          .expectStatus(200)
          .expectJsonLike({
            ...dto,
          });
      });
    });

    describe('Delete bookmark by id', () => {
      it('should delete a bookmark', async () => {
        await pactum
          .spec()
          .delete('/bookmarks/$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAccessToken}',
          })
          .expectStatus(204);
      });

      it('should throw if bookmark does not exist', async () => {
        await pactum
          .spec()
          .delete('/bookmarks/$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAccessToken}',
          })
          .expectStatus(404);
      });

      it('should return empty array of bookmarks', async () => {
        await pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAccessToken}',
          })
          .expectStatus(200)
          .expectJson([]);
      });
    });
  });
});