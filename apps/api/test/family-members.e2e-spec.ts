import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  familyMemberDetailResponseSchema,
  familyMemberResponseSchema,
  validationErrorBodySchema,
  type CreateFamilyMemberRequest,
} from '@time-capsule/shared';
import { AppModule } from './../src/app.module.js';

// Other e2e files share the database and run in parallel: unique names, no counts.
const unique = (name: string) =>
  `${name} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('FamilyMembersController (e2e)', () => {
  let app: INestApplication<App>;
  const createdIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();

    await app.init();
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await request(app.getHttpServer()).delete(`/family-members/${id}`);
    }
    await app.close();
  });

  async function create(body: CreateFamilyMemberRequest) {
    const res = await request(app.getHttpServer())
      .post('/family-members')
      .send(body)
      .expect(201);
    const familyMember = familyMemberDetailResponseSchema.parse(res.body);
    createdIds.push(familyMember.id);
    return familyMember;
  }

  async function fieldErrorsOf(res: request.Response) {
    expect(res.status).toBe(400);
    const body = validationErrorBodySchema.parse(res.body);
    expect(body.message).toBe('validation.failed');
    return body.errors.fieldErrors;
  }

  it('links parents and children both ways, and clears a deleted parent', async () => {
    const server = app.getHttpServer();
    const mother = await create({ name: unique('Anna'), kind: 'human' });
    const father = await create({
      name: unique('Jan'),
      kind: 'human',
      birthDate: '1960-02-01',
    });
    const child = await create({
      name: unique('Ola'),
      kind: 'human',
      description: 'Loves **horses**.',
      birthDate: '1990-03-01',
      motherId: mother.id,
      fatherId: father.id,
    });

    expect(child).toMatchObject({
      kind: 'human',
      description: 'Loves **horses**.',
      birthDate: '1990-03-01',
      deathDate: null,
      motherId: mother.id,
      fatherId: father.id,
      mother: { id: mother.id, name: mother.name, kind: 'human' },
      father: { id: father.id, name: father.name, kind: 'human' },
      children: [],
      milestones: [],
    });

    await request(server)
      .get(`/family-members/${mother.id}`)
      .expect(200)
      .expect((res) =>
        expect(
          familyMemberDetailResponseSchema.parse(res.body).children,
        ).toEqual([{ id: child.id, name: child.name, kind: 'human' }]),
      );

    await request(server)
      .get('/family-members')
      .expect(200)
      .expect((res) => {
        const list = familyMemberResponseSchema.array().parse(res.body);
        expect(list.map(({ id }) => id)).toEqual(
          expect.arrayContaining([mother.id, father.id, child.id]),
        );
        // The list has no relations. Checked on the raw body: parse() strips unknown keys.
        const rawChild = (res.body as Array<Record<string, unknown>>).find(
          (row) => row.id === child.id,
        );
        expect(rawChild).toBeDefined();
        for (const relation of ['mother', 'father', 'children', 'milestones']) {
          expect(rawChild).not.toHaveProperty(relation);
        }
      });

    await request(server)
      .patch(`/family-members/${child.id}`)
      .send({ deathDate: '2020-01-01' })
      .expect(200)
      .expect((res) =>
        expect(familyMemberDetailResponseSchema.parse(res.body)).toMatchObject({
          id: child.id,
          birthDate: '1990-03-01',
          deathDate: '2020-01-01',
        }),
      );

    // ON DELETE SET NULL on the self-reference: the child keeps an unknown mother.
    await request(server).delete(`/family-members/${mother.id}`).expect(204);
    await request(server)
      .get(`/family-members/${child.id}`)
      .expect(200)
      .expect((res) =>
        expect(familyMemberDetailResponseSchema.parse(res.body)).toMatchObject({
          motherId: null,
          mother: null,
          fatherId: father.id,
        }),
      );
    await request(server)
      .get(`/family-members/${mother.id}`)
      .expect(404)
      .expect((res) =>
        expect(res.body).toMatchObject({
          statusCode: 404,
          message: `Family member ${mother.id} not found`,
        }),
      );
    // Idempotent: deleting it again still answers 204.
    await request(server).delete(`/family-members/${mother.id}`).expect(204);
  });

  it('clears a parent with null', async () => {
    const mother = await create({ name: unique('Anna'), kind: 'human' });
    const child = await create({
      name: unique('Ola'),
      kind: 'human',
      motherId: mother.id,
    });

    await request(app.getHttpServer())
      .patch(`/family-members/${child.id}`)
      .send({ motherId: null })
      .expect(200)
      .expect((res) =>
        expect(familyMemberDetailResponseSchema.parse(res.body)).toMatchObject({
          motherId: null,
          mother: null,
        }),
      );
  });

  it('rejects an invalid body with i18n keys per field', async () => {
    const res = await request(app.getHttpServer())
      .post('/family-members')
      .send({
        name: ' ',
        kind: 'robot',
        birthDate: '2000-01-02',
        deathDate: '2000-01-01',
      });

    // Field checks fail first, so the cross-field rule isn't reported yet.
    expect(await fieldErrorsOf(res)).toEqual({
      name: ['validation.name.required'],
      kind: ['validation.familyMemberKind.invalid'],
    });
  });

  it('rejects a death date before the birth date', async () => {
    const res = await request(app.getHttpServer())
      .post('/family-members')
      .send({
        name: 'Ada',
        kind: 'human',
        birthDate: '2000-01-02',
        deathDate: '2000-01-01',
      });

    expect(await fieldErrorsOf(res)).toEqual({
      deathDate: ['validation.deathDate.beforeBirth'],
    });
  });

  it('rejects parents that do not exist', async () => {
    const res = await request(app.getHttpServer())
      .post('/family-members')
      .send({ name: 'Ada', kind: 'human', motherId: 999_999_999 });

    expect(await fieldErrorsOf(res)).toEqual({
      motherId: ['validation.familyMember.notFound'],
    });
  });

  it('rejects a family member as their own parent', async () => {
    const familyMember = await create({ name: unique('Ada'), kind: 'human' });

    const res = await request(app.getHttpServer())
      .patch(`/family-members/${familyMember.id}`)
      .send({ motherId: familyMember.id });

    expect(await fieldErrorsOf(res)).toEqual({
      motherId: ['validation.parent.self'],
    });
  });

  it('checks a PATCHed death date against the stored birth date', async () => {
    const familyMember = await create({
      name: unique('Ada'),
      kind: 'human',
      birthDate: '1950-05-03',
    });

    const res = await request(app.getHttpServer())
      .patch(`/family-members/${familyMember.id}`)
      .send({ deathDate: '1950-05-02' });

    expect(await fieldErrorsOf(res)).toEqual({
      deathDate: ['validation.deathDate.beforeBirth'],
    });
  });

  it('checks a PATCHed mother against the stored father', async () => {
    const father = await create({ name: unique('Jan'), kind: 'human' });
    const child = await create({
      name: unique('Ola'),
      kind: 'human',
      fatherId: father.id,
    });

    const res = await request(app.getHttpServer())
      .patch(`/family-members/${child.id}`)
      .send({ motherId: father.id });

    expect(await fieldErrorsOf(res)).toEqual({
      fatherId: ['validation.parents.same'],
    });
  });

  it('answers 404 when patching a missing family member', async () => {
    await request(app.getHttpServer())
      .patch('/family-members/999999999')
      .send({ name: 'Nobody' })
      .expect(404);
  });

  it('rejects a non-numeric id', async () => {
    await request(app.getHttpServer()).get('/family-members/abc').expect(400);
  });
});
